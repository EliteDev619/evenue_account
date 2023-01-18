const express = require("express");
var config = require("./config");
const { main } = require("./main.js");
const { getDomain } = require("./domain.js");

const app = express();
const port = config.PORT;

app.get("/", (req, res) => {
  res.send("Start!");
});

app.get("/ev-orders/order", async (req, res) => {
  const objEventInfo = {
    email: req.query.email,
    password: req.query.password,
    linkId: req.query.linkId,
  };

  const domain = await getDomain(req.query.linkId);
  objEventInfo.domain = domain;
  console.log(objEventInfo);
  const response = await main(objEventInfo);
  res.json(response);
});

app.listen(port, () => {
  console.log(`Scraping app listening on port ${port}!`);
});
