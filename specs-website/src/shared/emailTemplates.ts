/**
 * Shared HTML Email Templates for SPECS Organization Management System
 */

const BRAND_COLOR = '#0d6b66';
const BRAND_DARK = '#0b5c58';
const DANGER_COLOR = '#be123c';
const WARNING_COLOR = '#d97706';

/**
 * Generates HTML for an official payment receipt
 */
export const getReceiptHtml = (
  studentName: string,
  itemName: string,
  price: number,
  quantity: number,
  datePaid: string,
  transactionId: string
): string => {
  const total = price * quantity;
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 48px 16px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; text-align: left;">
            <!-- Brand Banner -->
            <tr>
              <td style="padding: 32px; background-color: ${BRAND_COLOR}; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">SPECS Official Receipt</h2>
                <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">Thank you for your payment!</p>
              </td>
            </tr>
            <!-- Content Area -->
            <tr>
              <td style="padding: 32px;">
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">Hi <strong>${studentName}</strong>,</p>
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                  This email confirms that we have successfully received your payment. Below are your receipt details.
                </p>

                <!-- Receipt Table -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
                  <thead>
                    <tr style="border-bottom: 2px solid #f1f5f9;">
                      <th align="left" style="padding: 12px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Item Description</th>
                      <th align="center" style="padding: 12px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; width: 60px;">Qty</th>
                      <th align="right" style="padding: 12px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; width: 120px;">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 16px 0; font-size: 14px; font-weight: 600; color: #1e293b;">${itemName}</td>
                      <td align="center" style="padding: 16px 0; font-size: 14px; color: #475569;">${quantity}</td>
                      <td align="right" style="padding: 16px 0; font-size: 14px; font-weight: 600; color: #1e293b;">PHP ${price.toFixed(2)}</td>
                    </tr>
                    <!-- Total Row -->
                    <tr>
                      <td colspan="2" style="padding: 16px 0 0 0; font-size: 15px; font-weight: 700; color: ${BRAND_COLOR}; text-align: right;">Total Amount:</td>
                      <td align="right" style="padding: 16px 0 0 0; font-size: 16px; font-weight: 800; color: ${BRAND_COLOR};">PHP ${(price * quantity).toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <!-- Details Panel -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; border: 1px solid #f1f5f9;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding: 4px 0; font-size: 12px; color: #64748b; font-weight: 600;">Receipt ID:</td>
                      <td align="right" style="padding: 4px 0; font-size: 12px; color: #1e293b; font-weight: 700; font-family: monospace;">${transactionId}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-size: 12px; color: #64748b; font-weight: 600;">Date Paid:</td>
                      <td align="right" style="padding: 4px 0; font-size: 12px; color: #1e293b; font-weight: 700;">${datePaid}</td>
                    </tr>
                    <tr>
                      <td style="padding: 4px 0; font-size: 12px; color: #64748b; font-weight: 600;">Status:</td>
                      <td align="right" style="padding: 4px 0; font-size: 12px; color: ${BRAND_COLOR}; font-weight: 700; text-transform: uppercase;">Paid</td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="color: #64748b; margin: 0; font-size: 12px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Sent via the <strong>SPECS Portal</strong>. Please do not reply directly to this message.
                </p>
                <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  &copy; ${currentYear} SPECS. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
};

interface DueItem {
  itemName: string;
  price: number;
  quantity: number;
  activity: string;
}

/**
 * Generates HTML for an outstanding dues notification
 */
export const getPaymentReminderHtml = (
  studentName: string,
  dues: DueItem[],
  portalURL: string
): string => {
  const currentYear = new Date().getFullYear();
  const totalAmount = dues.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const duesRows = dues
    .map(
      item => `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px 0;">
        <span style="font-size: 14px; font-weight: 600; color: #1e293b; display: block;">${item.itemName}</span>
        <span style="font-size: 11px; color: #64748b;">${item.activity}</span>
      </td>
      <td align="center" style="padding: 12px 0; font-size: 14px; color: #475569;">${item.quantity}</td>
      <td align="right" style="padding: 12px 0; font-size: 14px; font-weight: 600; color: ${DANGER_COLOR};">PHP ${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Outstanding Dues Notice</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 48px 16px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; text-align: left;">
            <!-- Brand Banner -->
            <tr>
              <td style="padding: 32px; background-color: ${DANGER_COLOR}; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Payment Notice</h2>
                <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">Outstanding Account Balance</p>
              </td>
            </tr>
            <!-- Content Area -->
            <tr>
              <td style="padding: 32px;">
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">Hi <strong>${studentName}</strong>,</p>
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                  This is a friendly reminder that you have outstanding dues under your SPECS account. Please review the details below:
                </p>

                <!-- Dues Table -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin-bottom: 24px;">
                  <thead>
                    <tr style="border-bottom: 2px solid #f1f5f9;">
                      <th align="left" style="padding: 12px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase;">Dues / Activity</th>
                      <th align="center" style="padding: 12px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; width: 60px;">Qty</th>
                      <th align="right" style="padding: 12px 0; font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; width: 120px;">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${duesRows}
                    <!-- Total Row -->
                    <tr>
                      <td colspan="2" style="padding: 16px 0 0 0; font-size: 15px; font-weight: 700; color: ${DANGER_COLOR}; text-align: right;">Total Balance Due:</td>
                      <td align="right" style="padding: 16px 0 0 0; font-size: 16px; font-weight: 800; color: ${DANGER_COLOR};">PHP ${totalAmount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <!-- Cash Payment Notice -->
                <div style="margin-top: 32px; padding: 20px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: ${DANGER_COLOR};">Cash Payment Required</p>
                  <p style="margin: 0; font-size: 13px; color: #991b1b; line-height: 1.5;">
                    Please settle your outstanding dues directly with the <strong>SPECS Treasurer</strong> via cash payment.
                  </p>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="color: #64748b; margin: 0; font-size: 12px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Sent via the <strong>SPECS Portal</strong>. Please do not reply directly to this message.
                </p>
                <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  &copy; ${currentYear} SPECS. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
};

/**
 * Generates HTML for an attendance check-in notification
 */
export const getAttendanceHtml = (
  studentName: string,
  eventName: string,
  date: string,
  status: string,
  timeIn: string,
  portalURL: string
): string => {
  const currentYear = new Date().getFullYear();
  let statusColor = BRAND_COLOR;

  if (status.toLowerCase() === 'absent') {
    statusColor = DANGER_COLOR;
  } else if (status.toLowerCase() === 'late') {
    statusColor = WARNING_COLOR;
  }

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Record</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 48px 16px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; text-align: left;">
            <!-- Brand Banner -->
            <tr>
              <td style="padding: 32px; background-color: ${BRAND_COLOR}; text-align: center; color: #ffffff;">
                <h2 style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Attendance Recorded</h2>
                <p style="margin: 8px 0 0 0; font-size: 13px; opacity: 0.9;">SPECS Organization Event</p>
              </td>
            </tr>
            <!-- Content Area -->
            <tr>
              <td style="padding: 32px;">
                <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">Hi <strong>${studentName}</strong>,</p>
                <p style="margin: 0 0 24px 0; font-size: 15px; color: #475569; line-height: 1.6;">
                  Your attendance has been recorded for the following organization event. Below are your record details:
                </p>

                <!-- Attendance Details Block -->
                <div style="background-color: #f8fafc; border-radius: 12px; padding: 24px; border: 1px solid #f1f5f9; margin-bottom: 24px;">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600; width: 120px;">Event Name:</td>
                      <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 700;">${eventName}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Date:</td>
                      <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 700;">${date}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Status:</td>
                      <td style="padding: 6px 0; font-size: 13px; color: ${statusColor}; font-weight: 800; text-transform: uppercase;">${status}</td>
                    </tr>
                    <tr>
                      <td style="padding: 6px 0; font-size: 13px; color: #64748b; font-weight: 600;">Time Logged:</td>
                      <td style="padding: 6px 0; font-size: 13px; color: #1e293b; font-weight: 700;">${timeIn}</td>
                    </tr>
                  </table>
                </div>

                <!-- Portal CTA -->
                <div style="text-align: center; margin: 32px 0 16px 0;">
                  <a href="${portalURL}" style="background-color: ${BRAND_COLOR}; color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(13, 107, 102, 0.2); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Check Attendance Portal
                  </a>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 24px 32px; text-align: center; border-top: 1px solid #f1f5f9;">
                <p style="color: #64748b; margin: 0; font-size: 12px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Sent via the <strong>SPECS Portal</strong>. Please do not reply directly to this message.
                </p>
                <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  &copy; ${currentYear} SPECS. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
};
