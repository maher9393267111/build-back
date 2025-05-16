const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear,
  subWeeks, 
  subMonths, 
  subYears,
  startOfDay,
  endOfDay,
  parseISO,
  format,
  subDays
} = require('date-fns');

// Track a page view
exports.trackView = async (req, res) => {
    const { path } = req.body;
    console.log(path , 'path❎✳❎✳');

    if (!path) {
        return res.status(400).json({ error: 'Path is required' });
    }

    try {
      const response =  await prisma.pageView.create({
            data: {
                path: path,
            },
        });
        console.log(response , 'response❎✳❎✳');
        res.status(201).json({ message: 'View tracked successfully' });
    } catch (error) {
        console.error('Error tracking view:', error);
        res.status(500).json({ error: 'Failed to track view' });
    }
};

// Get dashboard statistics
exports.getDashboardStats1 = async (req, res) => {
    try {
        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);
        const sevenDaysAgo = startOfDay(subDays(today, 6)); // Including today, so 6 days back

        const totalViews = await prisma.pageView.count();
        const todayViews = await prisma.pageView.count({
            where: {
                timestamp: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
        });

        const topPages = await prisma.pageView.groupBy({
            by: ['path'],
            _count: {
                path: true,
            },
            orderBy: {
                _count: {
                    path: 'desc',
                },
            },
            take: 10,
        });

        const viewsLast7Days = await prisma.pageView.findMany({
            where: {
                timestamp: {
                    gte: sevenDaysAgo,
                },
            },
            select: {
                timestamp: true,
            },
            orderBy: {
                timestamp: 'asc',
            },
        });

        // Aggregate views per day for the last 7 days
        const dailyViewsData = {};
        for (let i = 0; i < 7; i++) {
            const day = format(subDays(today, i), 'yyyy-MM-dd');
            dailyViewsData[day] = 0;
        }

        viewsLast7Days.forEach(view => {
            const day = format(view.timestamp, 'yyyy-MM-dd');
            if (dailyViewsData[day] !== undefined) {
                dailyViewsData[day]++;
            }
        });
        
        const formattedDailyViews = Object.entries(dailyViewsData)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            totalViews,
            todayViews,
            topPages: topPages.map(p => ({ path: p.path, views: p._count.path })),
            dailyTrend: formattedDailyViews,
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
};

// Get dashboard statistics with time period support
exports.getDashboardStats = async (req, res) => {
    try {
        const { period = 'weekly', limit = 10 } = req.query;
        console.log('req.query', req.query);
        const today = new Date();

        // Define date ranges based on period
        let startDate, endDate, dateFormat, periodCount;
        
        switch(period) {
            case 'yearly':
                startDate = startOfYear(subYears(today, 4)); // Last 5 years
                endDate = endOfYear(today);
                dateFormat = 'yyyy';
                periodCount = 5;
                break;
            case 'monthly':
                startDate = startOfMonth(subMonths(today, 11)); // Last 12 months
                endDate = endOfMonth(today);
                dateFormat = 'yyyy-MM';
                periodCount = 12;
                break;
            case 'weekly':
            default:
                startDate = startOfWeek(subWeeks(today, 11)); // Last 12 weeks
                endDate = endOfWeek(today);
                dateFormat = 'yyyy-\'W\'ww';
                periodCount = 12;
                break;
        }

        // Get total views
        const totalViewsCount = await prisma.pageView.count();
        const totalViews = Number(totalViewsCount);
        
        // Get today's views
        const todayViewsCount = await prisma.pageView.count({
            where: {
                timestamp: {
                    gte: startOfDay(today),
                    lte: endOfDay(today),
                },
            },
        });
        const todayViews = Number(todayViewsCount);

        // Get period-specific stats
        const currentPeriodStart = period === 'yearly' ? startOfYear(today) :
                                  period === 'monthly' ? startOfMonth(today) :
                                  startOfWeek(today);
        
        const currentPeriodViewsCount = await prisma.pageView.count({
            where: {
                timestamp: {
                    gte: currentPeriodStart,
                    lte: endDate,
                },
            },
        });
        const currentPeriodViews = Number(currentPeriodViewsCount);

        // Calculate previous period for comparison
        const previousPeriodStart = period === 'yearly' ? startOfYear(subYears(today, 1)) :
                                   period === 'monthly' ? startOfMonth(subMonths(today, 1)) :
                                   startOfWeek(subWeeks(today, 1));
        
        const previousPeriodEnd = period === 'yearly' ? endOfYear(subYears(today, 1)) :
                                 period === 'monthly' ? endOfMonth(subMonths(today, 1)) :
                                 endOfWeek(subWeeks(today, 1));

        const previousPeriodViewsCount = await prisma.pageView.count({
            where: {
                timestamp: {
                    gte: previousPeriodStart,
                    lte: previousPeriodEnd,
                },
            },
        });
        const previousPeriodViews = Number(previousPeriodViewsCount);

        // Calculate growth percentage
        const growthPercentage = previousPeriodViews > 0 
            ? parseFloat(((currentPeriodViews - previousPeriodViews) / previousPeriodViews * 100).toFixed(2))
            : 0;

        // Get top pages
        const topPagesData = await prisma.pageView.groupBy({
            by: ['path'],
            _count: {
                path: true,
            },
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            orderBy: {
                _count: {
                    path: 'desc',
                },
            },
            take: parseInt(limit),
        });
        const topPages = topPagesData.map(p => ({ path: p.path, views: Number(p._count.path) }));

        // Get views for the specified period
        const periodViews = await prisma.pageView.findMany({
            where: {
                timestamp: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                timestamp: true,
            },
            orderBy: {
                timestamp: 'asc',
            },
        });

        // Aggregate views by period
        const periodData = {};
        
        // Initialize all periods with 0
        for (let i = 0; i < periodCount; i++) {
            let periodKeyDate;
            if (period === 'yearly') {
                periodKeyDate = subYears(endDate, periodCount - 1 - i); // Iterate backwards from endDate
            } else if (period === 'monthly') {
                periodKeyDate = subMonths(endDate, periodCount - 1 - i);
            } else { // weekly
                periodKeyDate = subWeeks(endDate, periodCount - 1 - i);
            }
            const periodKey = format(periodKeyDate, dateFormat);
            periodData[periodKey] = 0;
        }
        
        // Count actual views
        periodViews.forEach(view => {
            const periodKey = format(view.timestamp, dateFormat);
            if (periodData[periodKey] !== undefined) {
                periodData[periodKey]++;
            }
        });

        // Format data for frontend
        const formattedPeriodData = Object.entries(periodData).map(([periodKey, count]) => {
            let label;
            if (dateFormat === 'yyyy') {
                label = periodKey;
            } else if (dateFormat === 'yyyy-MM') {
                label = format(parseISO(periodKey + '-01'), 'MMM yyyy');
            } else { // 'yyyy-'W'ww'
                const [year, weekNumWithW] = periodKey.split('-W');
                const weekNum = parseInt(weekNumWithW);
                // Create a date from year and ISO week.
                // Note: date-fns parse for ISO week 'yyyy-ww' expects 'w' or 'ww'.
                // We construct a date that falls within that week.
                // startOfISOWeek(setISOWeek(setYear(new Date(), parseInt(year)), weekNum)) might be more robust
                // but for simplicity, we take the start of the year and add weeks.
                // This might need adjustment if week numbering conventions differ greatly.
                const dateForWeek = new Date(parseInt(year), 0, (weekNum - 1) * 7 + 1); // Approx start of week
                label = format(dateForWeek, 'MMM dd, yyyy');
            }
            return {
                period: periodKey,
                count, // This count is already a number from JS increment
                label
            };
        });
        
        // Get hourly distribution for current day (for advanced analytics)
        const hourlyViewsData = await prisma.$queryRaw`
            SELECT 
                EXTRACT(HOUR FROM timestamp) as hour,
                COUNT(*) as views
            FROM "PageView"
            WHERE timestamp >= ${startOfDay(today)}::timestamp
            AND timestamp <= ${endOfDay(today)}::timestamp
            GROUP BY EXTRACT(HOUR FROM timestamp)
            ORDER BY hour
        `;
        
        // Ensure views in hourlyDistribution are numbers
        const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
            const hourData = hourlyViewsData.find(h => parseInt(h.hour) === hour);
            return {
                hour,
                views: hourData ? Number(hourData.views) : 0
            };
        });

        // Get average views per day/week/month
        const avgViews = periodCount > 0 ? Math.round(periodViews.length / periodCount) : 0;

        // Get unique visitors approximation
        const uniqueVisitorsResult = await prisma.$queryRaw`
            SELECT COUNT(DISTINCT DATE_TRUNC('minute', timestamp)) as unique_count
            FROM "PageView"
            WHERE timestamp >= ${startDate}::timestamp
            AND timestamp <= ${endDate}::timestamp
        `;
        const uniqueVisitorsApprox = Number(uniqueVisitorsResult[0]?.unique_count || 0);

        res.status(200).json({
            totalViews,
            todayViews,
            currentPeriodViews,
            previousPeriodViews,
            growthPercentage: growthPercentage, // Already a number
            avgViewsPerPeriod: avgViews, // Already a number
            uniqueVisitorsApprox,
            topPages, // Already converted
            periodTrend: formattedPeriodData, // Counts are already numbers
            hourlyDistribution, // Already converted
            period,
            periodLabel: period.charAt(0).toUpperCase() + period.slice(1)
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Failed to fetch dashboard stats', details: error.message });
    }
};

// Track page activity (creation, updates, deletions)
exports.trackPageActivity = async (req, res) => {
    const { pageId, pageName, action } = req.body;

    if (!pageName || !action) {
        return res.status(400).json({ error: 'Page name and action are required' });
    }

    try {
        await prisma.pageActivity.create({
            data: {
                pageId: pageId ? parseInt(pageId) : null,
                pageName,
                action,
                
            },
        });
        res.status(201).json({ message: 'Page activity tracked successfully' });
    } catch (error) {
        console.error('Error tracking page activity:', error);
        res.status(500).json({ error: 'Failed to track page activity' });
    }
};

// Get page activity statistics
exports.getPageActivityStats = async (req, res) => {
    try {
        const { page: recentActivityPage = 1, limit: recentActivityLimit = 10 } = req.query;
        const skipRecentActivities = (parseInt(recentActivityPage) - 1) * parseInt(recentActivityLimit);

        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);
        const thirtyDaysAgo = startOfDay(subDays(today, 29)); // 30 days including today

        // Count activities by type
        const activityCounts = await prisma.pageActivity.groupBy({
            by: ['action'],
            _count: {
                action: true,
            },
        });

        // Format for easy consumption by frontend
        const activityStats = {
            created: 0,
            updated: 0,
            deleted: 0
        };
        
        activityCounts.forEach(item => {
            if (activityStats.hasOwnProperty(item.action)) {
                activityStats[item.action] = item._count.action;
            }
        });

        // Get recent activities - paginated
        const [recentActivities, totalRecentActivities] = await Promise.all([
            prisma.pageActivity.findMany({
                orderBy: {
                    timestamp: 'desc',
                },
                skip: skipRecentActivities,
                take: parseInt(recentActivityLimit),
            }),
            prisma.pageActivity.count() // Count all recent activities for pagination
        ]);
        
        const totalPagesRecentActivities = Math.ceil(totalRecentActivities / parseInt(recentActivityLimit));

        // Get daily activity counts for the last 30 days
        const dailyActivities = await prisma.pageActivity.findMany({
            where: {
                timestamp: {
                    gte: thirtyDaysAgo,
                },
            },
            select: {
                action: true,
                timestamp: true,
            },
            orderBy: {
                timestamp: 'asc',
            },
        });

        // Prepare data for charts - daily breakdown by action type
        const dailyData = {};
        for (let i = 0; i < 30; i++) {
            const day = format(subDays(today, i), 'yyyy-MM-dd');
            dailyData[day] = { created: 0, updated: 0, deleted: 0 };
        }

        dailyActivities.forEach(activity => {
            const day = format(activity.timestamp, 'yyyy-MM-dd');
            if (dailyData[day] && dailyData[day][activity.action] !== undefined) {
                dailyData[day][activity.action]++;
            }
        });

        const formattedDailyData = Object.entries(dailyData)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            activityStats,
            recentActivities: {
                data: recentActivities,
                currentPage: parseInt(recentActivityPage),
                totalPages: totalPagesRecentActivities,
                totalCount: totalRecentActivities
            },
            dailyTrend: formattedDailyData,
        });
    } catch (error) {
        console.error('Error fetching page activity stats:', error);
        res.status(500).json({ error: 'Failed to fetch page activity stats' });
    }
};

// Add this new function for form submission statistics
exports.getFormSubmissionStats = async (req, res) => {
    try {
        const { page: recentSubmissionPage = 1, limit: recentSubmissionLimit = 10 } = req.query;
        const skipRecentSubmissions = (parseInt(recentSubmissionPage) - 1) * parseInt(recentSubmissionLimit);

        const today = new Date();
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);
        const thirtyDaysAgo = startOfDay(subDays(today, 29));

        // Get total submissions
        const totalSubmissions = await prisma.formSubmission.count();
        
        // Get today's submissions
        const todaySubmissions = await prisma.formSubmission.count({
            where: {
                createdAt: {
                    gte: startOfToday,
                    lte: endOfToday,
                },
            },
        });
        
        // Get submissions by status
        const submissionsByStatus = await prisma.formSubmission.groupBy({
            by: ['status'],
            _count: {
                id: true,
            },
        });
        
        // Get recent submissions - paginated
        const [recentSubmissions, totalRecentSubmissions] = await Promise.all([
            prisma.formSubmission.findMany({
                skip: skipRecentSubmissions,
                take: parseInt(recentSubmissionLimit),
                orderBy: {
                    createdAt: 'desc',
                },
                include: {
                    form: {
                        select: {
                            title: true,
                        },
                    },
                },
            }),
            prisma.formSubmission.count() // Count all submissions for pagination of recent submissions
        ]);

        const totalPagesRecentSubmissions = Math.ceil(totalRecentSubmissions / parseInt(recentSubmissionLimit));
        
        // Get submissions by day for the last 30 days
        const dailySubmissions = await prisma.formSubmission.findMany({
            where: {
                createdAt: {
                    gte: thirtyDaysAgo,
                },
            },
            select: {
                createdAt: true,
                status: true,
            },
        });

        // Prepare data for daily trend
        const dailyData = {};
        for (let i = 0; i < 30; i++) {
            const day = format(subDays(today, i), 'yyyy-MM-dd');
            dailyData[day] = { new: 0, processed: 0, closed: 0, total: 0 };
        }

        dailySubmissions.forEach(submission => {
            const day = format(submission.createdAt, 'yyyy-MM-dd');
            if (dailyData[day]) {
                if (dailyData[day].hasOwnProperty(submission.status)) {
                    dailyData[day][submission.status]++;
                }
                dailyData[day].total++;
            }
        });

        const formattedDailyData = Object.entries(dailyData)
            .map(([date, counts]) => ({ date, ...counts }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        res.status(200).json({
            totalSubmissions,
            todaySubmissions,
            submissionsByStatus: submissionsByStatus.map(s => ({ 
                status: s.status, 
                count: s._count.id 
            })),
            recentSubmissions: {
                data: recentSubmissions,
                currentPage: parseInt(recentSubmissionPage),
                totalPages: totalPagesRecentSubmissions,
                totalCount: totalRecentSubmissions
            },
            dailyTrend: formattedDailyData,
        });
    } catch (error) {
        console.error('Error fetching form submission stats:', error);
        res.status(500).json({ error: 'Failed to fetch form submission stats' });
    }
};



exports.getGlobalStats = async (req, res) => {
    try {
        const today = new Date();
        const startOfCurrentMonth = startOfMonth(today);
        const endOfCurrentMonth = endOfMonth(today);
        
        // Get pages statistics
        const [totalPages, publishedPages, draftPages, pagesThisMonth] = await Promise.all([
            prisma.page.count(),
            prisma.page.count({ where: { status: 'published' } }),
            prisma.page.count({ where: { status: 'draft' } }),
            prisma.page.count({
                where: {
                    createdAt: {
                        gte: startOfCurrentMonth,
                        lte: endOfCurrentMonth,
                    },
                },
            }),
        ]);

        // Get blogs statistics
        const [totalBlogs, publishedBlogs, draftBlogs, blogsThisMonth] = await Promise.all([
            prisma.blog.count(),
            prisma.blog.count({ where: { status: 'published' } }),
            prisma.blog.count({ where: { status: 'draft' } }),
            prisma.blog.count({
                where: {
                    createdAt: {
                        gte: startOfCurrentMonth,
                        lte: endOfCurrentMonth,
                    },
                },
            }),
        ]);

        // Get monthly growth data for the last 6 months
        const monthlyGrowthData = [];
        for (let i = 5; i >= 0; i--) {
            const monthStart = startOfMonth(subMonths(today, i));
            const monthEnd = endOfMonth(subMonths(today, i));
            
            const [pagesCreated, blogsCreated] = await Promise.all([
                prisma.page.count({
                    where: {
                        createdAt: {
                            gte: monthStart,
                            lte: monthEnd,
                        },
                    },
                }),
                prisma.blog.count({
                    where: {
                        createdAt: {
                            gte: monthStart,
                            lte: monthEnd,
                        },
                    },
                }),
            ]);

            monthlyGrowthData.push({
                month: format(monthStart, 'yyyy-MM'),
                label: format(monthStart, 'MMM yyyy'),
                pages: pagesCreated,
                blogs: blogsCreated,
                total: pagesCreated + blogsCreated,
            });
        }

        // Get recent pages (last 5)
        const recentPages = await prisma.page.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                slug: true,
            },
        });

        // Get recent blogs (last 5)
        const recentBlogs = await prisma.blog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: {
                id: true,
                title: true,
                status: true,
                createdAt: true,
                slug: true,
                category: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Calculate average content creation per month
        // Get data for the last 12 months
        const tweleveMonthsAgo = subMonths(today, 12);
        const [pagesLastYear, blogsLastYear] = await Promise.all([
            prisma.page.count({
                where: {
                    createdAt: {
                        gte: tweleveMonthsAgo,
                    },
                },
            }),
            prisma.blog.count({
                where: {
                    createdAt: {
                        gte: tweleveMonthsAgo,
                    },
                },
            }),
        ]);

        const avgContentPerMonth = Math.round((pagesLastYear + blogsLastYear) / 12);

        // Get content by category (for blogs)
        const blogsByCategory = await prisma.blog.groupBy({
            by: ['categoryId'],
            _count: {
                id: true,
            },
        });

        // Format the blog categories data
        const categoryStats = await Promise.all(
            blogsByCategory.map(async (item) => {
                const category = await prisma.blogCategory.findUnique({
                    where: { id: item.categoryId },
                    select: { name: true },
                });
                return {
                    categoryName: category?.name || 'Unknown',
                    count: item._count.id,
                };
            })
        );

        // Calculate content distribution by status
        const contentDistribution = {
            published: publishedPages + publishedBlogs,
            draft: draftPages + draftBlogs,
            total: totalPages + totalBlogs,
        };

        res.status(200).json({
            pages: {
                total: totalPages,
                published: publishedPages,
                draft: draftPages,
                thisMonth: pagesThisMonth,
            },
            blogs: {
                total: totalBlogs,
                published: publishedBlogs,
                draft: draftBlogs,
                thisMonth: blogsThisMonth,
            },
            monthlyGrowth: monthlyGrowthData,
            recentPages,
            recentBlogs,
            avgContentPerMonth,
            categoryStats,
            contentDistribution,
            summary: {
                totalContent: totalPages + totalBlogs,
                publishedContent: publishedPages + publishedBlogs,
                draftContent: draftPages + draftBlogs,
                thisMonthTotal: pagesThisMonth + blogsThisMonth,
                publishRate: totalPages + totalBlogs > 0 
                    ? Math.round(((publishedPages + publishedBlogs) / (totalPages + totalBlogs)) * 100)
                    : 0,
            },
        });
    } catch (error) {
        console.error('Error fetching global stats:', error);
        res.status(500).json({ error: 'Failed to fetch global statistics', details: error.message });
    }
};




// Reset form submissions - sets all submissions back to "new" status
exports.resetFormSubmissions = async (req, res) => {
    try {
        const updatedSubmissions = await prisma.formSubmission.deleteMany({});

        res.status(200).json({
            message: 'Form submissions reset successfully',
            updatedCount: updatedSubmissions.count
        });
    } catch (error) {
        console.error('Error resetting form submissions:', error);
        res.status(500).json({ error: 'Failed to reset form submissions', details: error.message });
    }
};

// Reset form submissions for a specific form
exports.resetFormSubmissionsByFormId = async (req, res) => {
    try {
        const { formId } = req.params;

        if (!formId) {
            return res.status(400).json({ error: 'Form ID is required' });
        }

        const updatedSubmissions = await prisma.formSubmission.updateMany({
            where: {
                formId: parseInt(formId),
                status: {
                    not: 'new'
                }
            },
            data: {
                status: 'new',
                updatedAt: new Date()
            }
        });

        res.status(200).json({
            message: `Form submissions for form ${formId} reset successfully`,
            updatedCount: updatedSubmissions.count
        });
    } catch (error) {
        console.error('Error resetting form submissions:', error);
        res.status(500).json({ error: 'Failed to reset form submissions', details: error.message });
    }
};

// Reset page activities - clears all page activity logs
exports.resetPageActivities = async (req, res) => {
    try {
        const deletedActivities = await prisma.pageActivity.deleteMany({});

        res.status(200).json({
            message: 'Page activities reset successfully',
            deletedCount: deletedActivities.count
        });
    } catch (error) {
        console.error('Error resetting page activities:', error);
        res.status(500).json({ error: 'Failed to reset page activities', details: error.message });
    }
};