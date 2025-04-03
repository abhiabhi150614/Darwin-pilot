const nodemailer = require('nodemailer');

// Create a transporter object using Ethereal Email (fake SMTP service for testing)
const createTransporter = async () => {
    // Create a test account on Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    // Create a transporter using Ethereal credentials
    const transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: testAccount.user,
            pass: testAccount.pass
        }
    });
    
    return { transporter, testAccount };
};

// Welcome email template
const sendWelcomeEmail = async (company) => {
    try {
        // Get transporter and test account
        const { transporter, testAccount } = await createTransporter();
        
        // Email content
        const mailOptions = {
            from: '"Ship Route Optimizers 312D" <sro312d@example.com>',
            to: company.email,
            subject: 'Welcome to Ship Route Optimizers 312D',
            html: `
                <div style="font-family: 'Poppins', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
                    <div style="background-color: #1a4b84; padding: 20px; text-align: center; color: white; border-radius: 4px 4px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">Welcome to SRO 312D</h1>
                    </div>
                    
                    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 4px 4px; border: 1px solid #eee; border-top: none;">
                        <p style="margin-top: 0; font-size: 16px;">Dear <strong>${company.ownerName}</strong>,</p>
                        
                        <p style="font-size: 16px;">On behalf of the entire Ship Route Optimizers team, we are thrilled to welcome you to our maritime route optimization platform. We are excited to have ${company.companyName} join our growing network of forward-thinking shipping companies committed to efficiency and sustainability.</p>
                        
                        <p style="font-size: 16px;">With SRO 312D, you now have access to cutting-edge route optimization technology that will help you:</p>
                        
                        <ul style="font-size: 16px;">
                            <li>Reduce fuel consumption by up to 15%</li>
                            <li>Minimize environmental impact through optimized routing</li>
                            <li>Save valuable time with efficient shipping routes</li>
                            <li>Access detailed resource savings analytics</li>
                        </ul>
                        
                        <p style="font-size: 16px;">Your account has been successfully created with the following credentials:</p>
                        
                        <div style="background-color: #f0f4f8; padding: 15px; border-radius: 4px; margin: 20px 0; font-size: 16px;">
                            <p style="margin: 5px 0;"><strong>Company ID:</strong> ${company.companyId}</p>
                            <p style="margin: 5px 0;"><strong>Password:</strong> (The password you provided during registration)</p>
                        </div>
                        
                        <p style="font-size: 16px;">You can log in to your account by visiting <a href="http://localhost:3000/login" style="color: #0097b2; text-decoration: none;">our login page</a>.</p>
                        
                        <p style="font-size: 16px;">If you have any questions or need assistance getting started, please don't hesitate to contact our support team.</p>
                        
                        <p style="font-size: 16px;">Welcome aboard! We look forward to helping you navigate smarter and more sustainably.</p>
                        
                        <p style="font-size: 16px;">Warm regards,</p>
                        <p style="font-size: 16px;"><strong>The SRO 312D Team</strong></p>
                        
                        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;">
                            <p>Ship Route Optimizers 312D</p>
                            <p>This is an automated message, please do not reply directly to this email.</p>
                        </div>
                    </div>
                </div>
            `
        };

        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`Welcome email sent to ${company.email}: ${info.messageId}`);
        
        // Generate a preview URL to view the email
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`Preview URL: ${previewUrl}`);
        
        return {
            success: true,
            messageId: info.messageId,
            previewUrl
        };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        throw error;
    }
};

module.exports = {
    sendWelcomeEmail
}; 