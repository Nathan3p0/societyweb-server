require('dotenv').config();
const express = require('express');
const requireAuth = require('../../middleware/jwt-auth');
const MessageService = require('./messages-service');
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.TWILIO_TOKEN;
const client = require('twilio')(accountSid, authToken);
const sgMail = require('@sendgrid/mail');
const jsonBodyParser = express.json();
const messageRouter = express.Router();

messageRouter.post('/invite', requireAuth, jsonBodyParser, (req, res, next) => {
    const { phone } = req.body;
    const db = req.app.get('db');
    const { id, full_name } = req.user;

    if (!phone) {
        return res.status(400).json(
            { error: `Please enter a phone number` }
        )
    }

    MessageService.findGroupByAdminId(db, id)
        .then(group => {
            if (!group) {
                return res.status(400).json({
                    error: `Please check that you are logged in as an Admin.`
                })
            }

            const newPhone = phone.replace(/-/g, '');
            const messageBody = `${full_name} has invited you to join ${group.group_name} on SocietyWeb. Use invite code: ${group.invite_code} to join.`

            return client.messages
                .create({
                    body: messageBody,
                    from: process.env.PHONE_NUMBER,
                    to: `+1${newPhone}`
                })
                .then(message => res.json(message))

        })
})

messageRouter.post('/email', requireAuth, jsonBodyParser, (req, res, next) => {
    const { to, from, subject, text } = req.body;


    for (const field of ['to', 'from', 'subject', 'text']) {
        if (!req.body[field]) {
            return res.status(400).json({
                error: `Please enter a ${field}`
            })
        }
    }

    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
        to: to,
        from: from,
        subject: subject,
        text: text,
    };

    sgMail.sendMultiple(msg)
        .then(res => {
            return res.status(200).json({
                success: 'It was successful!!'
            })
        })
        .catch(error => {
            const { message, code, response } = error;

            return res.json({
                message,
                code,
                response
            })
        })


})


module.exports = messageRouter;