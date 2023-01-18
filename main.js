var axios = require("axios");
var { CookieJar } = require("tough-cookie");
var { wrapper } = require("axios-cookiejar-support");
var config = require("./config");

var sid = Math.floor(Math.random() * 1000000);

const jar = new CookieJar();
const session = wrapper(
  axios.create({
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36",
    },
    followAllRedirects: true,
    withCredentials: true,
    timeout: config.TIMEOUT,
    proxy: {
      protocol: config.PROXY_PROTOCAL,
      host: config.PROXY_HOST,
      port: config.PROXY_PORT,
      auth: {
        username: config.PROXY_AUTH_USER + "-" + sid,
        password: config.PROXY_AUTH_PASS,
      },
    },
    jar: jar,
  })
);

function getDomain(param) {
  return param.split("net")[0] + "net";
}

function getSiteID(param) {
  return "ev_" + param.split("linkID=")[1];
}

async function main(objEventInfo, nTrial = 0) {
  try {
    var strSiteID = "ev_" + objEventInfo.linkId;
    var strDomain = "https://" + objEventInfo.domain;

    var objLoginForm = {
      email: objEventInfo.email,
      password: objEventInfo.password,
      siteId: strSiteID,
      domain: strDomain,
      remember: false,
      skipSession: false,
    };

    var signinResponse = await session.request({
      url: strDomain + "/pac-api/auth/signin",
      data: JSON.stringify(objLoginForm),
      method: "post",
      headers: {
        "content-type": "application/json",
      },
    });

    var objResult = {};
    var objTempData = {
      eventLink: "",
      data: {},
    };
    objTempData.eventLink = objEventInfo.domain;

    if (signinResponse.data.result) {
      var pac_authz = signinResponse.headers["pac-authz"];

      var objAccountRes = signinResponse.data.result;
      var nAccountCN = objAccountRes.cn;
      var nAccountTS = objAccountRes.ts;

      let cookies = signinResponse.headers["set-cookie"]
        .map((cookie) => {
          return cookie.split("; ")[0];
        })
        .join("; ");

      var response = await session
        .request({
          url: strDomain + "/app/ws/patron/" + nAccountCN + "/myAccount",
          method: "GET",
          headers: {
            "content-type": "application/json",
            Cookie: cookies,
          },
        })
        .catch((error) => console.log("account info ====", error));
      objTempData.data.account = response.data;

      var response = await session.request({
        url:
          strDomain +
          "/app/ws/history/" +
          nAccountCN +
          "/orderhistory?siteId=" +
          strSiteID +
          "&locale=en_US&poolId=pac8-evcluster1&requestType=ORDERS&maxItems=500&sortType=getOrderDt&_=" +
          nAccountTS,
        method: "GET",
        headers: {
          "content-type": "application/json",
          Cookie: cookies,
        },
      });
      objTempData.data.orderHistory = response.data;

      var response = await session
        .get(strDomain + "/pac-api/orderhistory/pendingTransfers", {
          headers: {
            "pac-authz": pac_authz,
          },
        })
        .catch((error) => console.log("pending transfer info ====", error));

      objTempData.data.pendingTransfer = response.data;

      var response = await session
        .get(strDomain + "/pac-api/orderhistory/seasons/transfer", {
          headers: {
            "pac-authz": pac_authz,
          },
        })
        .catch((error) => console.log("transfer info ====", error));

      if (response.data.result.length == 0) {
        objResult.success = false;
        objResult.message = "No Tickets in account";
      } else {
        var strSeasonCd = response.data.result[0].events[0].seasonCd;
        var nEventCd = response.data.result[0].events[0].eventCd;

        var response = await session
          .get(
            strDomain +
              "/pac-api/orderhistory-event/" +
              strSeasonCd +
              "/" +
              nEventCd,
            {
              headers: {
                "pac-authz": pac_authz,
              },
            }
          )
          .catch((error) => console.log("seatdetail info ====", error));
        objTempData.data.transfer = response.data.events[0].seats[0];

        objResult = objTempData.data;
        objResult.success = true;
      }
    } else {
      console.log("account info is incorrect!!");
      objResult.success = false;
      objResult.message = "Incorrect Password";
    }

    return objResult;
  } catch (error) {
    if (nTrial < 3) {
      main(objEventInfo, nTrial++);
    }

    return {
      success: false,
      message: "Unexcepted Message",
    };
  }
}

module.exports = {
  main,
};
