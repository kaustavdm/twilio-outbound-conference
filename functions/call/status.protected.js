exports.handler = async function (context, event, callback) {
  // TODO: improve status handling.
  // Might want to log this to Airtable
  console.log("Status Callback Event:", event.confName, event.callerType, event.CallStatus);
  return callback(null, {});
};
