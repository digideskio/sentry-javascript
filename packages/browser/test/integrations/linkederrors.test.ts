import { expect } from 'chai';
import { stub } from 'sinon';
import { LinkedErrors } from '../../src/integrations/linkederrors';

let linkedErrors: LinkedErrors;

interface ExtendedError extends Error {
  [key: string]: any;
}

describe('LinkedErrors', () => {
  beforeEach(() => {
    linkedErrors = new LinkedErrors();
  });

  describe('handler', () => {
    it('should bail out if event doesnt contain exception', () => {
      const spy = stub(linkedErrors, 'walkErrorTree');
      const event = {
        message: 'foo',
      };
      const result = linkedErrors.handler(event);
      expect(spy.called).equal(false);
      expect(result).to.deep.equal(event);
    });

    it('should bail out if event contains exception, but no hint', () => {
      const spy = stub(linkedErrors, 'walkErrorTree');
      const event = {
        exception: {
          values: [],
        },
        message: 'foo',
      };
      const result = linkedErrors.handler(event);
      expect(spy.called).equal(false);
      expect(result).to.deep.equal(event);
    });

    it('should call walkErrorTree if event contains exception and hint with originalException', () => {
      const spy = stub(linkedErrors, 'walkErrorTree').callsFake(() => []);
      const event = {
        exception: {
          values: [],
        },
        message: 'foo',
      };
      const hint = {
        originalException: new Error('originalException'),
      };
      linkedErrors.handler(event, hint);
      expect(spy.calledOnce).equal(true);
    });

    it('should recursively walk error to find linked exceptions and assign them to the event', () => {
      const event = {
        exception: {
          values: [],
        },
        message: 'foo',
      };

      const one: ExtendedError = new Error('one');
      const two: ExtendedError = new TypeError('two');
      const three: ExtendedError = new SyntaxError('three');

      const originalException = one;
      one.cause = two;
      two.cause = three;

      const result = linkedErrors.handler(event, {
        originalException,
      });

      // It shouldn't include root exception, as it's already processed in the event by the main error handler
      expect(result!.exception!.values!.length).equal(2);
      expect(result!.exception!.values![0].type).equal('TypeError');
      expect(result!.exception!.values![0].value).equal('two');
      expect(result!.exception!.values![0].stacktrace).to.have.property('frames');
      expect(result!.exception!.values![1].type).equal('SyntaxError');
      expect(result!.exception!.values![1].value).equal('three');
      expect(result!.exception!.values![1].stacktrace).to.have.property('frames');
    });

    it('should allow to change walk key', () => {
      linkedErrors = new LinkedErrors({
        key: 'reason',
      });
      const event = {
        exception: {
          values: [],
        },
        message: 'foo',
      };

      const one: ExtendedError = new Error('one');
      const two: ExtendedError = new TypeError('two');
      const three: ExtendedError = new SyntaxError('three');

      const originalException = one;
      one.reason = two;
      two.reason = three;

      const result = linkedErrors.handler(event, {
        originalException,
      });

      // It shouldn't include root exception, as it's already processed in the event by the main error handler
      expect(result!.exception!.values!.length).equal(2);
      expect(result!.exception!.values![0].type).equal('TypeError');
      expect(result!.exception!.values![0].value).equal('two');
      expect(result!.exception!.values![0].stacktrace).to.have.property('frames');
      expect(result!.exception!.values![1].type).equal('SyntaxError');
      expect(result!.exception!.values![1].value).equal('three');
      expect(result!.exception!.values![1].stacktrace).to.have.property('frames');
    });
  });
});
