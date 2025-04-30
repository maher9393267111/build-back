const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const axios = require('axios');
const crypto = require('crypto');

dotenv.config();

const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            role: user.role 
        }, 
        process.env.SECRET_KEY, 
        { expiresIn: '7d' }
    );
};

// Generate a random verification code
const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send SMS verification code
const sendSmsVerificationCode = async (phoneNumber, code, sender = "FixServices") => {
    try {
        // Format phone number - remove leading '0' if present
        const formattedPhoneNumber = phoneNumber.startsWith('0') 
            ? phoneNumber.substring(1) 
            : phoneNumber;

        const smsPayload = {
            sender: sender,
            destination: formattedPhoneNumber,
            content: `Your verification code is: ${code}. Valid for 10 minutes.`,
            tag: "verification",
            metadata: {
                type: "verification",
                timestamp: new Date().toISOString(),
            },
        };

        console.log("SMS Send Payload:", smsPayload);

        const config = {
            method: "post",
            url: "https://api.thesmsworks.co.uk/v1/message/send",
            headers: {
                "Content-Type": "application/json",
                Authorization: `JWT eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXkiOiJlYzQwODUzOS02ZTVlLTRhZTgtYmRkOS0yMGJhYjllYTNmODYiLCJzZWNyZXQiOiI0NzQ2NWM3ZmE1ZTZkODNlYmM5ZjhmNmZjN2VlMzg2ZmUyZDA2YWYzZmQwOTU0ZTRjYmEzM2E5MjYyYTQ3YjMzIiwiaWF0IjoxNzM2MTcyNDQ2LCJleHAiOjI1MjQ1NzI0NDZ9.axax3mpC6Veadxj3Cwxs9YQ1GRt2mwStl2mUcMIabhA`,
            },
            data: smsPayload,
        };

        const response = await axios(config);
        console.log("SMS Send Response:", response.data);
        return response.data;
    } catch (error) {
        console.error("SMS Verification Error:", error.response ? error.response.data : error.message);
        throw error;
    }
};
// const SENDGRID_API_KEY="";
// const SENDMAIL_FROM="";


// // Send email verification code
// const sendEmailVerificationCode = async (email, code) => {
//     try {
//         // SendGrid integration would go here
//         const sgMail = require('@sendgrid/mail');
//         sgMail.setApiKey(SENDGRID_API_KEY);
//         console.log(email ,'EMAIL');
//         const msg = {
//             to: email,
//             from: SENDMAIL_FROM,
//             subject: 'Your Verification Code',
//             text: `Your verification code is: ${code}. Valid for 10 minutes.`,
//             html: `<p>Your verification code is: <strong>${code}</strong>. Valid for 10 minutes.</p>`,
//         };
        
//         await sgMail.send(msg);
//         return true;
//     } catch (error) {
//         console.error("Email Verification Error:", error);
//         throw error;
//     }
// };

exports.register = async (req, res) => {
    try {
        const { 
            email, password, name, phone, role, 
            businessName, businessType, businessPhone,
            address, address2, address3, city, state, postcode, country,
            foundedYear, employeeCount 
        } = req.body;
        
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });
        
        if (existingUser) {
            return res.status(400).json({ error: 'User with this email already exists' });
        }
        
        // Generate verification code
        const verificationCode = generateVerificationCode();
        const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
        // Create new user
        const newUser = await prisma.user.create({
            data: {
                email,
                password, // Note: In production, you should hash this password
                name,
                phone,
                role: role || "ADMIN",
                verificationCode,
                verificationExpiry
            }
        });
        
        // If it's a service provider, create a profile with the extended information
        if (role === 'SERVICE_PROVIDER') {
            await prisma.serviceProvider.create({
                data: {
                    userId: newUser.id,
                    businessName: businessName || name + "'s Business",
                    businessType: businessType || "Self Employed",
                    businessPhone: businessPhone || phone,
                    address: address || '',
                    address2: address2 || '',
                    address3: address3 || '',
                    city: city || '',
                    state: state || '',
                    postcode: postcode || '',
                    country: country || 'UK',
                    employeeCount: employeeCount ? parseInt(employeeCount) : 1,
                    foundedYear: foundedYear || new Date().getFullYear()
                }
            });
        }
        
        // Send verification code
        try {
            // if (phone) {
            //     await sendSmsVerificationCode(phone, verificationCode);
            // }
            
           //if (email) {
                // await sendEmailVerificationCode(email, verificationCode);
           // }
        } catch (verificationError) {
            console.error('Verification sending error:', verificationError);
            // We still proceed with registration even if verification sending fails
        }
        
        // Generate token
        const token = generateToken(newUser);
        
        // Remove password from response
        const { password: _, ...userData } = newUser;
        
        return res.status(201).json({
            message: 'User registered successfully. Please verify your account with the code sent to your email/phone.',
            user: userData,
            token
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Registration failed' });
    }
};

exports.verifyAccount = async (req, res) => {
    try {
        const { userId, code } = req.body;
        
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.verified) {
            return res.status(400).json({ error: 'Account already verified' });
        }
        
        if (user.verificationCode !== code) {
            return res.status(400).json({ error: 'Invalid verification code' });
        }
        
        if (user.verificationExpiry && new Date() > new Date(user.verificationExpiry)) {
            return res.status(400).json({ error: 'Verification code expired' });
        }
        
        // Mark user as verified
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                verified: true,
                verificationCode: null,
                verificationExpiry: null
            }
        });
        
        return res.status(200).json({
            message: 'Account verified successfully'
        });
    } catch (error) {
        console.error('Verification error:', error);
        return res.status(500).json({ error: 'Verification failed' });
    }
};

// exports.resendVerification = async (req, res) => {
//     try {
//         const { email } = req.body;
        
//         const user = await prisma.user.findUnique({
//             where: { email }
//         });
        
//         if (!user) {
//             return res.status(404).json({ error: 'User not found' });
//         }
        
//         if (user.verified) {
//             return res.status(400).json({ error: 'Account already verified' });
//         }
        
//         // Generate new verification code
//         const verificationCode = generateVerificationCode();
//         const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
//         // Update user with new code
//         await prisma.user.update({
//             where: { id: user.id },
//             data: { 
//                 verificationCode,
//                 verificationExpiry
//             }
//         });
        
//         // Send new verification code
//         try {
//             if (user.phone) {
//                 await sendSmsVerificationCode(user.phone, verificationCode);
//             }
            
//             await sendEmailVerificationCode(user.email, verificationCode);
//         } catch (verificationError) {
//             console.error('Verification resending error:', verificationError);
//             return res.status(500).json({ error: 'Failed to send verification code' });
//         }
        
//         return res.status(200).json({
//             message: 'Verification code resent successfully'
//         });
//     } catch (error) {
//         console.error('Resend verification error:', error);
//         return res.status(500).json({ error: 'Failed to resend verification code' });
//     }
// };

exports.resendVerification = async (req, res) => {
    try {
        const { email, phone } = req.body;
        
        if (!email && !phone) {
            return res.status(400).json({ error: 'Email or phone number is required' });
        }
        
        // Find user by email or phone
        const user = await prisma.user.findFirst({
            where: email ? { email } : { phone }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        if (user.verified) {
            return res.status(400).json({ error: 'Account already verified' });
        }
        
        // Generate new verification code
        const verificationCode = generateVerificationCode();
        const verificationExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
        
        // Update user with new code
        await prisma.user.update({
            where: { id: user.id },
            data: { 
                verificationCode,
                verificationExpiry
            }
        });
        
        // Send new verification code
        try {
            if (phone) {
                await sendSmsVerificationCode(phone, verificationCode);
                return res.status(200).json({
                    message: 'Verification code sent to your phone number'
                });
            }
            
            if (email) {
                // await sendEmailVerificationCode(email, verificationCode);
                return res.status(200).json({
                    message: 'Verification code sent to your email address'
                });
            }
        } catch (verificationError) {
            console.error('Verification resending error:', verificationError);
            return res.status(500).json({ error: 'Failed to send verification code' });
        }
    } catch (error) {
        console.error('Resend verification error:', error);
        return res.status(500).json({ error: 'Failed to resend verification code' });
    }
};
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password (in production, compare hashed passwords)
        if (user.password !== password) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Generate token
        const token = generateToken(user);
        
        // Remove password from response
        const { password: _, ...userData } = user;
        
        return res.status(200).json({
            message: 'Login successful',
            user: userData,
            token,
            needsVerification: !user.verified
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed' });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                role: true,
                createdAt: true,
                status: true,
                profileImage: true,
                verified: true
            }
        });
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Get service provider details if applicable
        let serviceProvider = null;
        if (user.role === 'SERVICE_PROVIDER') {
            serviceProvider = await prisma.serviceProvider.findUnique({
                where: { userId: userId }
            });
        }
        
        return res.status(200).json({ 
            user,
            serviceProvider
        });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Failed to get profile' });
    }
};