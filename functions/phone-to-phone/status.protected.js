exports.handler = async function (context, event, callback) {
  // TODO: improve status handling.
  // Might want to log this to Airtable
  console.log("Status Callback Event:", event.ConferenceName, event.CallerType, event.CallStatus);
  return callback(null, {});
};
