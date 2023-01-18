var axios = require("axios");

async function getDomain(linkID) {
  var strURL = `https://pachtml-production.s3.us-west-2.amazonaws.com/www/${linkID}/pleasehold/pleaseHold.json`;

  let response = await axios.get(strURL);
  return response.data.domain;
}

module.exports = { getDomain };
