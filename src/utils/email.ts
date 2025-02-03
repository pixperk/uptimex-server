import { IEmailLocals } from "@app/interfaces/notification.interface";
import { SENDER_EMAIL, SENDER_EMAIL_PASSWORD } from "@app/server/config";
import logger from "@app/server/logger";
import nodemailer from "nodemailer";
import ejs from "ejs";
import fs from "fs";
import path from "path";

export async function sendEmail(template: string, receiver: string, locals: IEmailLocals) {
    try {
        // Read and compile the EJS template
        const templatePath = path.join(__dirname, "..", "emails", `${template}.ejs`);
        const emailHtml = await compileTemplate(templatePath, locals);

        if (!emailHtml) {
            logger.error(`Failed to compile email template: ${template}`);
            return;
        }

        await sendMail(receiver, `${template === 'errorStatus' ? "Your Site is Down" : "Your Site is Now Back Up"}`, emailHtml);
        logger.info(`Email successfully sent to ${receiver}`);
    } catch (error) {
        logger.error(`Email notification error: ${error}`);
    }
}

async function compileTemplate(templatePath: string, locals: IEmailLocals): Promise<string | null> {
    try {
        const templateContent = fs.readFileSync(templatePath, "utf-8");
        return ejs.render(templateContent, locals);
    } catch (error) {
        logger.error(`Error rendering email template: ${error}`);
        return null;
    }
}

async function sendMail(receiver: string, subject: string, html: string) {
    try {
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: SENDER_EMAIL,
                pass: SENDER_EMAIL_PASSWORD,
            },
        });

        await transporter.sendMail({
            from: `UptimeX <${SENDER_EMAIL}>`,
            to: receiver,
            subject,
            html, // Send compiled HTML template
        });

        logger.info(`Email successfully sent to ${receiver}`);
    } catch (error) {
        logger.error("Email send error:", error);
    }
}
