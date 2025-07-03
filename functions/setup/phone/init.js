exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const email = event.email;
  const phoneNumber = event.phone_number;

  // Validate input
  if (!email) {
    return callback(new Error('Email is required'), null);
  }
  if (!phoneNumber) {
    return callback(new Error('Phone number is required'), null);
  }
  if (!context.VERIFY_SERVICE_SID) {
    return callback(new Error('`VERIFY_SERVICE_SID` must be set in environment variable'), null);
  }
  if (!context.SYNC_SERVICE_SID) {
    return callback(new Error('`SYNC_SERVICE_SID` must be set in environment variable'), null);
  }

  try {
    // Check if email is verified
    // let emailDoc;
    // try {
    //   emailDoc = await client.sync.v1
    //     .services(context.SYNC_SERVICE_SID)
    //     .documents(`verified_email_${email}`)
    //     .fetch();
    // } catch (err) {
    //   if (err.code === 20404) {
    //     return callback(new Error('Email must be verified before verifying phone number.'), null);
    //   }
    //   throw err;
    // }

    // Check if phone number is already verified
    try {
      await client.sync.v1
        .services(context.SYNC_SERVICE_SID)
        .documents(`verified_phone_${phoneNumber}`)
        .fetch();
      // If fetch succeeds, phone is already verified
      return callback(new Error('Phone number has already been verified.'), null);
    } catch (err) {
      if (err.code !== 20404) {
        // 20404 means not found, which is what we want
        throw err;
      }
    }

    // Create a Verify challenge for the phone number
    const verification = await client.verify.v2
      .services(context.VERIFY_SERVICE_SID)
      .verifications.create({
        to: phoneNumber,
        channel: 'sms', // or 'rcs' if supported
      });

    return callback(null, {
      status: 'success',
      message: 'OTP sent successfully to phone number',
      data: {
        to: phoneNumber,
        channel: verification.channel,
        status: verification.status,
        valid: verification.valid,
        sid: verification.sid,
      },
    });
  } catch (error) {
    console.error('Error in phone verification init:', error);
    return callback(error, null);
  }
};
