const twilio = require('twilio');

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const phoneNumber = event.phone_number;
  const code = event.code;

  // Validate input
  if (!phoneNumber) {
    return callback(new Error('Phone number is required'), null);
  }
  if (!code) {
    return callback(new Error('Verification code is required'), null);
  }
  if (!context.VERIFY_SERVICE_SID) {
    return callback(new Error('`VERIFY_SERVICE_SID` must be set in environment variable'), null);
  }
  if (!context.SYNC_SERVICE_SID) {
    return callback(new Error('`SYNC_SERVICE_SID` must be set in environment variable'), null);
  }

  try {
    // Verify the code using Twilio Verify
    const verificationCheck = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verificationChecks.create({
        to: phoneNumber,
        code: code,
      });

    if (verificationCheck.status !== 'approved') {
      return callback(new Error('Invalid or expired verification code'), null);
    }

    // Store verified phone in Twilio Sync
    const timestamp = new Date().toISOString();
    await client.sync.v1
      .services(context.SYNC_SERVICE_SID)
      .documents.create({
        uniqueName: `verified_phone_${phoneNumber}`,
        data: {
          phone_number: phoneNumber,
          verified: true,
          verified_at: timestamp,
        },
      });

    return callback(null, {
      status: 'success',
      message: 'Phone number verified successfully.',
      data: {
        phone_number: phoneNumber,
        verified: true,
        verified_at: timestamp,
        verification: {
          status: verificationCheck.status,
          valid: verificationCheck.valid,
          sid: verificationCheck.sid,
        },
      },
    });
  } catch (error) {
    // If document already exists, update it
    if (error.message && error.message.includes('Document already exists')) {
      try {
        const timestamp = new Date().toISOString();
        await client.sync.v1
          .services(context.SYNC_SERVICE_SID)
          .documents(`verified_phone_${phoneNumber}`)
          .update({
            data: {
              phone_number: phoneNumber,
              verified: true,
              verified_at: timestamp,
            },
          });
        return callback(null, {
          status: 'success',
          message: 'Phone number verified successfully (updated existing record).',
          data: {
            phone_number: phoneNumber,
            verified: true,
            verified_at: timestamp,
          },
        });
      } catch (updateError) {
        return callback(updateError, null);
      }
    }
    console.error('Error in phone verification validate:', error);
    return callback(error, null);
  }
};
