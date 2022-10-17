import { APIGatewayProxyEvent } from 'aws-lambda';
export class ProfitRatioBusiness {
  /** コンストラクタ */
  constructor() {}

  /**
   * リクエストペイロードのバリデーション
   *
   * @param event リクエストペイロード
   * @returns 全てのチェックを通貨したペイロード | エラー内容を含むレスポンスbody
   */
  validateRequest(event: APIGatewayProxyEvent): passedRequest | hasValidationErrorBody {
    return {
      error: {
        messages: ['xxx'],
      },
    };
  }

//===================================================================== 型定義
/**
 * バリデーションを通ったリクエスト
 */
type passedRequest = {
  queryStringParameters: {
    baseFiat: string;
  };
};

/**
 * バリデーションエラーがあった場合のレスポンスbody
 */
type hasValidationErrorBody = {
  error: {
    messages: string[];
  };
};
