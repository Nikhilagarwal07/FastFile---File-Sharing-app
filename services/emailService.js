const nodemailer = require('nodemailer');


async function sendMail({from,to,subject,text,html}) {
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
            user: process.env.MAIL_USER,
            pass: process.env.MAIL_PASSWORD
        }
    });

    let info = await transporter.sendMail({
        from: `Nikhil<${from}>`,
        to: to,
        subject: subject,
        text, //if key value are same then can write like this
        html

    })
}


module.exports = sendMail;