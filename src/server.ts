import express, { type Express, type Request, type Response } from "express";
import { OrderStore } from "./store";
import { pickScenario, resolveCollect } from "./scenarios";
import type {
  AuthRequest,
  AuthResponse,
  CollectRequest,
  ErrorResponse,
  MockServerOptions,
  SignRequest,
} from "./types";

const DEFAULT_OPTIONS: Required<MockServerOptions> = {
  defaultScenario: "success",
  pollsUntilResolved: 3,
  fixturePersonalNumber: "199001011234",
  fixtureName: "Test Testsson",
};

export interface MockServer {
  app: Express;
  store: OrderStore;
}

export function createMockServer(options: MockServerOptions = {}): MockServer {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const store = new OrderStore();
  const app = express();

  app.use(express.json());

  app.post("/rp/v6.0/auth", (req: Request, res: Response) => {
    handleAuthOrSign(req, res, "auth");
  });

  app.post("/rp/v6.0/sign", (req: Request, res: Response) => {
    handleAuthOrSign(req, res, "sign");
  });

  app.post("/rp/v6.0/collect", (req: Request, res: Response) => {
    const body = req.body as CollectRequest;
    if (!body?.orderRef) {
      return sendError(res, 400, "invalidParameters", "Missing orderRef");
    }
    const order = store.incrementPoll(body.orderRef);
    if (!order) {
      return sendError(res, 404, "notFound", "No such order");
    }
    const response = resolveCollect(order, opts);
    res.json(response);
  });

  app.post("/rp/v6.0/cancel", (req: Request, res: Response) => {
    const body = req.body as CollectRequest;
    if (!body?.orderRef) {
      return sendError(res, 400, "invalidParameters", "Missing orderRef");
    }
    const ok = store.cancel(body.orderRef);
    if (!ok) {
      return sendError(res, 404, "notFound", "No such order");
    }
    res.json({});
  });

  function handleAuthOrSign(req: Request, res: Response, kind: "auth" | "sign") {
    const body = req.body as AuthRequest | SignRequest;

    if (!body?.endUserIp) {
      return sendError(res, 400, "invalidParameters", "Missing required field: endUserIp");
    }
    if (kind === "sign" && !(body as SignRequest).userVisibleData) {
      return sendError(res, 400, "invalidParameters", "Missing required field: userVisibleData");
    }

    const headerScenario = req.header("x-mock-scenario");
    const scenario = pickScenario(opts.defaultScenario, headerScenario);

    const order = store.create({
      scenario,
      endUserIp: body.endUserIp,
      requestedPersonalNumber: body.requirement?.personalNumber,
    });

    const response: AuthResponse = {
      orderRef: order.orderRef,
      autoStartToken: order.autoStartToken,
      qrStartToken: order.qrStartToken,
      qrStartSecret: order.qrStartSecret,
    };
    res.json(response);
  }

  function sendError(res: Response, status: number, errorCode: string, details: string) {
    const body: ErrorResponse = { errorCode, details };
    res.status(status).json(body);
  }

  return { app, store };
}
