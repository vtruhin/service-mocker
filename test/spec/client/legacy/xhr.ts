import { expect } from 'chai';

import {
  XHRtoPromise,
  XHREventToPromise,
  XHRListenerToPromise,
} from '../helpers/xhr';

const EVENTS_LIST = [
  'readystatechange',
  'loadstart',
  'progress',
  'load',
  'loadend',
];

export function XHRRunner () {
  describe('XHR patch', () => {
    describe('Infrastructure', () => {
      it('should be marked with `mockerPatched`', () => {
        expect(XMLHttpRequest).to.have.property('mockerPatched')
          .and.that.is.true;
      });

      it('should have a reference to native `XMLHttpRequest`', () => {
        expect(XMLHttpRequest).to.have.property('native');
      });

      it('should obtain all properties that native XHR have', () => {
        const xhr = new XMLHttpRequest();
        const nativeXHR = new (XMLHttpRequest as any).native();

        for (let prop in nativeXHR) {
          expect(xhr).to.have.property(prop);
        }
      });
    });

    describe('REAL requests', () => {
      it('should fire on-events', () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/', true);

        const promises = Promise.all(
          EVENTS_LIST.map(type => XHREventToPromise(xhr, type)),
        );

        xhr.send();

        return promises;
      });

      it('should fire event listeners', () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/', true);

        const promises = Promise.all(
          EVENTS_LIST.map(type => XHRListenerToPromise(xhr, type)),
        );

        xhr.send();

        return promises;
      });
    });

    describe('MOCK requests', () => {
      it('should fire on-events', () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/api', true);

        const promises = Promise.all(
          EVENTS_LIST.map(type => XHREventToPromise(xhr, type)),
        );

        xhr.send();

        return promises;
      });

      it('should fire event listeners', () => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/api', true);

        const promises = Promise.all(
          EVENTS_LIST.map(type => XHRListenerToPromise(xhr, type)),
        );

        xhr.send();

        return promises;
      });
    });

    describe('.responseType', () => {
      it('should return type ArrayBuffer', async () => {
        const xhr = await XHRtoPromise('/arraybuffer', (xhr) => {
          xhr.responseType = 'arraybuffer';
        });

        expect(xhr.response).to.be.instanceof(ArrayBuffer);
      });

      it('should return type Blob', async () => {
        const xhr = await XHRtoPromise('/blob', (xhr) => {
          xhr.responseType = 'blob';
        });

        expect(xhr.response).to.be.instanceof(Blob);
      });

      it('should return type Document', async () => {
        const xhr = await XHRtoPromise('/document', (xhr) => {
          xhr.responseType = 'document';
        });

        expect(xhr.response).to.be.instanceof(Document);
      });

      it('should return type JSON', async function() {
        const xhr = await XHRtoPromise('/json', (xhr) => {
          xhr.responseType = 'json';
        });

        if (!xhr.responseType) {
          this.skip();
        }

        expect(xhr.response).to.be.an('object');
      });

      it('should return type text', async function() {
        const xhr = await XHRtoPromise('/api', (xhr) => {
          xhr.responseType = 'text';
        });

        expect(xhr.response).to.be.a('string');
      });

      it('should NOT throw error when parsing failed', async function() {
        let error = null;

        try {
          await XHRtoPromise('/blob', (xhr) => {
            xhr.responseType = 'document';
          });
        } catch (e) {
          error = e;
        }

        expect(error).to.be.null;
      });

      it('should return null when parsing failed', async function() {
        const xhr = await XHRtoPromise('/blob', (xhr) => {
          xhr.responseType = 'document';
        });

        expect(xhr.response).to.be.null;
      });
    });

    describe('.setRequestHeader()', () => {
      it('should get "MockerClient"', async () => {
        const xhr = await XHRtoPromise('/custom-header', (xhr) => {
          xhr.setRequestHeader('X-Custom', 'MockerClient');
        });

        expect(xhr.responseText).to.equal('MockerClient');
      });
    });

    describe('.getResponseHeader()', () => {
      it('should get "ServiceMocker"', async () => {
        const xhr = await XHRtoPromise('/custom-header');
        const header = xhr.getResponseHeader('X-Powered-By');

        expect(header).to.equal('ServiceMocker');
      });

      it('should return native header', async () => {
        const xhr = await XHRtoPromise(('/'));
        const header = xhr.getResponseHeader('X-Powered-By');

        expect(header).to.not.equal('ServiceMocker');
      });
    });

    describe('.getAllResponseHeaders()', () => {
      it('should use 0x0D 0x0A as linebreak characters', async () => {
        const linebreaker = String.fromCharCode(0x0D) + String.fromCharCode(0x0A);

        const xhr = await XHRtoPromise('/custom-header', (xhr) => {
          xhr.setRequestHeader('X-Custom', 'MockerClient');
        });

        const headers = xhr.getAllResponseHeaders();

        expect(headers).to.have.string(linebreaker);
      });

      it('should return native headers', async () => {
        const xhr = await XHRtoPromise(('/'));

        const headers = xhr.getAllResponseHeaders();

        expect(headers).to.not.have.string('ServiceMocker');
      });
    });

    describe('.overrideMimeType()', () => {
      it('should get contentType "text/plain"', async function() {
        // overrideMimeType is only supported on IE11+
        if (!(XMLHttpRequest as any).native.prototype.overrideMimeType) {
          this.skip();
        }

        const xhr = await XHRtoPromise('/json', (xhr) => {
          xhr.overrideMimeType('text/plain');
        });

        const contentType = xhr.getResponseHeader('content-type');

        expect(contentType).to.equal('text/plain');
      });
    });

    describe('.send()', () => {
      it('should throw an error when state is not OPENED', () => {
        let err: any;

        try {
          const xhr = new XMLHttpRequest();
          xhr.send();
        } catch (e) {
          err = e;
        }

        expect(err).not.to.be.null;
      });

      it('should ignore body for GET request', async () => {
        const promise = fetchRequestToPromise();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/', true);
        xhr.send('whatever');

        const request = await promise;

        expect(await request.text()).to.be.empty;
      });

      it('should ignore body for HEAD request', async () => {
        const promise = fetchRequestToPromise();
        const xhr = new XMLHttpRequest();
        xhr.open('HEAD', '/', true);
        xhr.send('whatever');

        const request = await promise;

        expect(await request.text()).to.be.empty;
      });

      it('should NOT ignore body for OPTIONS request', async () => {
        const promise = fetchRequestToPromise();
        const xhr = new XMLHttpRequest();
        xhr.open('OPTIONS', '/', true);
        xhr.send('whatever');

        const request = await promise;

        expect(await request.text()).to.equal('whatever');
      });

      it('should include credentials', async () => {
        const promise = fetchRequestToPromise();
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/', true);
        xhr.withCredentials = true;
        xhr.send();

        const request = await promise;

        expect(request.credentials).to.equal('include');
      });
    });
  });
}

function fetchRequestToPromise(): Promise<Request> {
  return new Promise((resolve) => {
    self.addEventListener('fetch', (event: FetchEvent) => {
      resolve(event.request.clone());
    });
  });
}
