const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.auth = async (req, res, next) => {
    try {
        if (!req.headers.authorization) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        const token = req.headers.authorization.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Authentication token required' });
        }
        
        const decoded = jwt.verify(token, process.env.SECRET_KEY);
        
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: decoded.role === 'SERVICE_PROVIDER' ? { serviceProvider: true } : undefined
        });
        
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        
        if (user.role === 'SERVICE_PROVIDER') {
            req.user = user;
        } else {
            const { serviceProvider, ...userWithoutSP } = user;
            req.user = userWithoutSP;
        }
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'You do not have permission to perform this action' });
        }
        
        next();
    };
};