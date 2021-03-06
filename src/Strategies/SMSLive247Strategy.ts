import axios from 'axios';
import buildUrl from 'build-url';
import { CountryCode } from 'libphonenumber-js';
import chunk from 'lodash/chunk';

import { InvalidArgsError } from '../utils/errors/InvalidArgsError';
import { SMSStrategy } from './SMSStrategy';
import { messageType, Strategy } from './Strategy';

export type SMSLive247Credential = {
  sender: string | null;
  sessionId: string;
};

export class SMSLive247Strategy extends SMSStrategy implements Strategy {
  constructor() {
    super();
  }

  protected readonly api: string = 'http://www.smslive247.com/http/index.aspx';
  protected readonly MAX_MSG_GET = 100;
  protected readonly MAX_MSG_POST = 300; // Post not working, throws err 99

  protected _credentials!: SMSLive247Credential;

  credentials(credentials: SMSLive247Credential): SMSLive247Strategy {
    this._credentials = credentials;
    return this;
  }

  get batchSize(): number {
    return this.MAX_MSG_GET;
  }

  async send(
    recipient: string | string[],
    country: CountryCode,
    message: string,
    type: messageType = 'TEXT'
  ): Promise<string | string[]> {
    const msg = this.sanitizeMessage(message);
    if (!this.isValidMessageLength(msg)) {
      throw new InvalidArgsError(`Message length should be ${this.length} characters or less`);
    }

    const recipients = this.getValidRecipients(recipient, country);
    const chunked: string[][] = chunk(recipients, this.batchSize);
    return Promise.all(
      chunked.map(async (chk) => {
        const url = buildUrl(this.api, {
          queryParams: {
            cmd: 'sendmsg',
            sessionid: this._credentials.sessionId,
            message: msg,
            sender: this._credentials.sender as string,
            sendto: chk,
            msgtype: this.parseMessageType(type),
          },
        });

        const { data } = await axios.get(url);
        return data;
      })
    );
  }

  protected parseMessageType(type: string): string {
    switch (type) {
      case 'TEXT':
        return '0';
      case 'FLASH':
        return '1';

      default:
        throw new Error('Unknown message type');
    }
  }
}
