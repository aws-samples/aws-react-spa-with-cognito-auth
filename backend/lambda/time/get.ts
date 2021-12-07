import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from "aws-lambda";

const formatDate = (date: Date) => {
  const dt = new Date(date);
  const yyyy = dt.getFullYear();
  const mm = ("00" + (dt.getMonth() + 1)).slice(-2);
  const dd = ("00" + dt.getDate()).slice(-2);
  const hh = ("00" + dt.getHours()).slice(-2);
  const min = ("00" + dt.getMinutes()).slice(-2);
  return yyyy + "/" + mm + "/" + dd + " " + hh + ":" + min;
};

exports.handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  let status = 200;
  let response = {};
  try {
    response = { cur_date: formatDate(new Date()) };
  } catch (e) {
    console.log(e);
    status = 500;
  }

  return {
    statusCode: status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(response),
  };
};
