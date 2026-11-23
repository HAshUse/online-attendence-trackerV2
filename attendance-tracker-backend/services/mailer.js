import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

export const sendLowAttendanceMail = async (studentEmail, studentName, percentage, branchName) => {
  try {
    await transporter.sendMail({
      from: `"BARABARI Attendance" <${process.env.EMAIL_USER}>`,
      to: studentEmail,
      subject: "⚠ Low Attendance Warning",
      html: `
        <h2>Hello ${studentName}</h2>

        <p>Your attendance in <b>${branchName}</b> is currently:</p>
        <h1 style="color:red">${percentage}%</h1>

        <p>Please attend upcoming classes regularly.</p>

        <p>
        If attendance falls below required level, you may not be eligible
        for certification.
        </p>

        <br/>
        <p>— BARABARI Team</p>
      `
    });

    console.log("Mail sent to:", studentEmail);

  } catch (err) {
    console.log("Mail failed:", studentEmail, err.message);
  }
};

/**
 * Send cleaned attendance report directly to stakeholders with Excel sheet attached.
 */
export const sendStakeholderExcelEmail = async (recipients, subject, summary, excelBuffer, filename = "Attendance_Report.xlsx") => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new Error("Email credentials not configured in server environment.");
  }

  const toList = Array.isArray(recipients) ? recipients.join(", ") : recipients;

  const mailOptions = {
    from: `"Online Attendance Tracker" <${process.env.EMAIL_USER}>`,
    to: toList,
    subject: subject || "📊 Attendance & Engagement Report for Stakeholders",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); color: #fff; padding: 24px; text-align: center;">
          <h2 style="margin: 0; font-size: 20px;">📊 Attendance & Engagement Report</h2>
          <p style="margin: 4px 0 0; opacity: 0.9; font-size: 14px;">Automated Stakeholder Summary</p>
        </div>
        <div style="padding: 24px; background: #ffffff;">
          <h3 style="margin-top: 0; color: #1e293b; font-size: 16px;">Executive Summary:</h3>
          <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; border-radius: 4px; font-size: 14px; color: #334155; margin-bottom: 20px;">
            ${summary || "Please find the attached cleaned attendance spreadsheet for details."}
          </div>
          <p style="font-size: 14px; color: #64748b; margin-bottom: 0;">
            The complete, formatted data sheet is attached as <b>${filename}</b>.
          </p>
        </div>
        <div style="background: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
          Sent via Online Attendance Tracker • Automated Report Dispatch
        </div>
      </div>
    `,
    attachments: [
      {
        filename,
        content: excelBuffer,
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  };

  return await transporter.sendMail(mailOptions);
};
