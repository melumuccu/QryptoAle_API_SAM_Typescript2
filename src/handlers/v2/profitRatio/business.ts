import { APIGatewayProxyEvent } from 'aws-lambda';
import { BaseFiatConsts } from '../../../consts/baseFiatConsts';
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
    const errorMessages: string[] = [];

    const queryParams = event.queryStringParameters;
    const baseFiat = queryParams?.baseFiat;

    // queryStringParameters の必須チェック
    if (queryParams == null) {
      errorMessages.push('No query parameters.');
    } else {
      // baseFiat 関連チェック
      if (baseFiat == null) {
        errorMessages.push("Query parameter 'baseFiat' is required.");
      } else {
        const baseFiatArray = Object.entries(BaseFiatConsts.name).map(x => x[1]);
        if (!baseFiatArray.some(x => x === baseFiat)) {
          errorMessages.push(
            `Query parameter 'baseFiat' must be included by listed values. passed baseFiat: ${baseFiat}`
          );
        }
      }
    }

    if (errorMessages.length > 0) {
      return {
        error: {
          messages: errorMessages,
        },
      };
    }

    return {
      queryStringParameters: {
        baseFiat: baseFiat as string,
      },
    };
  }

  /**
   * 渡された各取引所の各assetについてBalanceを取得する
   *
   * @param exchanges 取引所インスタンスのリスト
   * @returns 渡された全ての取引所インスタンスについてのBalance
   */
  async fetchBalances(exchanges: CryptoExchange[]): Promise<BalancesPerExchange> {
    return {
      BINANCE: {
        USDT: {
          free: 'xxxx',
          locked: 'xxxx',
        },
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
