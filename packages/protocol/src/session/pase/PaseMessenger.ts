/**
 * @license
 * Copyright 2022-2025 Matter.js Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bytes, Duration, UnexpectedDataError } from "#general";
import { SecureMessageType, TlvSchema } from "#types";
import { ExchangeSendOptions } from "../../protocol/MessageExchange.js";
import { DEFAULT_NORMAL_PROCESSING_TIME, SecureChannelMessenger } from "../../securechannel/SecureChannelMessenger.js";
import {
    PasePake1,
    PasePake2,
    PasePake3,
    PbkdfParamRequest,
    PbkdfParamResponse,
    TlvPasePake1,
    TlvPasePake2,
    TlvPasePake3,
    TlvPbkdfParamRequest,
    TlvPbkdfParamResponse,
} from "./PaseMessages.js";

export const DEFAULT_PASSCODE_ID = 0;
export const SPAKE_CONTEXT = Bytes.fromString("CHIP PAKE V1 Commissioning");

export class PaseServerMessenger extends SecureChannelMessenger {
    #closed = false;

    async readPbkdfParamRequest() {
        const { payload } = await this.nextMessage(SecureMessageType.PbkdfParamRequest, DEFAULT_NORMAL_PROCESSING_TIME);
        return { requestPayload: payload, request: TlvPbkdfParamRequest.decode(payload) as PbkdfParamRequest };
    }

    async sendPbkdfParamResponse(response: PbkdfParamResponse) {
        return this.send(response, SecureMessageType.PbkdfParamResponse, TlvPbkdfParamResponse, {
            expectedProcessingTime: DEFAULT_NORMAL_PROCESSING_TIME,
        });
    }

    readPasePake1() {
        return this.nextMessageDecoded(SecureMessageType.PasePake1, TlvPasePake1);
    }

    sendPasePake2(pasePake2: PasePake2) {
        return this.send(pasePake2, SecureMessageType.PasePake2, TlvPasePake2);
    }

    readPasePake3() {
        return this.nextMessageDecoded(SecureMessageType.PasePake3, TlvPasePake3);
    }

    override close() {
        this.#closed = true;
        return super.close();
    }

    override send<T>(message: T, type: number, schema: TlvSchema<T>, options?: ExchangeSendOptions) {
        if (this.#closed) {
            throw new UnexpectedDataError("Cannot send message, messenger is closed");
        }
        return super.send(message, type, schema, options);
    }

    override async nextMessage(
        expectedMessageType: number,
        expectedProcessingTimeMs?: Duration,
        expectedMessageInfo?: string,
    ) {
        if (this.#closed) {
            throw new UnexpectedDataError("Cannot read message, messenger is closed");
        }
        const result = await super.nextMessage(expectedMessageType, expectedProcessingTimeMs, expectedMessageInfo);
        if (this.#closed) {
            throw new UnexpectedDataError("Cannot read message, messenger is closed");
        }
        return result;
    }
}

export class PaseClientMessenger extends SecureChannelMessenger {
    sendPbkdfParamRequest(request: PbkdfParamRequest) {
        return this.send(request, SecureMessageType.PbkdfParamRequest, TlvPbkdfParamRequest, {
            expectedProcessingTime: DEFAULT_NORMAL_PROCESSING_TIME,
        });
    }

    async readPbkdfParamResponse() {
        const { payload } = await this.nextMessage(
            SecureMessageType.PbkdfParamResponse,
            DEFAULT_NORMAL_PROCESSING_TIME,
        );

        // TODO Add support for BUSY response and resend the message after waiting time
        return { responsePayload: payload, response: TlvPbkdfParamResponse.decode(payload) as PbkdfParamResponse };
    }

    sendPasePake1(pasePake1: PasePake1) {
        return this.send(pasePake1, SecureMessageType.PasePake1, TlvPasePake1);
    }

    readPasePake2() {
        return this.nextMessageDecoded(SecureMessageType.PasePake2, TlvPasePake2);
    }

    sendPasePake3(pasePake3: PasePake3) {
        return this.send(pasePake3, SecureMessageType.PasePake3, TlvPasePake3);
    }
}
