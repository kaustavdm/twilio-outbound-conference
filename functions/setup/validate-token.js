exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  // Get token from the request
  const token = event.token;

  // Run validations
  if (!token) {
    return callback(new Error("Token is required"), null);
  }

  // Check required environment variables
  if (!context.SYNC_SERVICE_SID) {
    return callback(
      new Error("`SYNC_SERVICE_SID` must be set in environment variable"),
      null
    );
  }

  try {
    // Look up the token in Twilio Sync
    const tokenDocument = await client.sync.v1
      .services(context.SYNC_SERVICE_SID)
      .documents(`token_${token}`)
      .fetch();

    const tokenData = tokenDocument.data;

    // Check if token has expired
    const expiresAt = new Date(tokenData.expiresAt);
    const now = new Date();

    if (now > expiresAt) {
      return callback(new Error("Token has expired"), null);
    }

    // Token is valid, return the associated email and verification info
    return callback(null, {
      status: "success",
      message: "Token is valid",
      data: {
        email: tokenData.email,
        verifiedAt: tokenData.verifiedAt,
        expiresAt: tokenData.expiresAt,
        isValid: true,
      },
    });
  } catch (error) {
    console.error("Error validating token:", error);
    
    if (error.code === 20404) {
      return callback(new Error("Invalid token"), null);
    }
    
    return callback(error, null);
  }
};
