import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import "source-map-support/register";

/**
 * A simple example includes a HTTP get method.
 */
export const exampleHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // All log statements are written to CloudWatch
  console.debug("Received event:", event);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:8100',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
    body: JSON.stringify({
      message: "Hello world!",
    }),
  };
};
