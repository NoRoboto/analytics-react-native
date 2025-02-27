import { SegmentClient } from '../../analytics';
import { getMockLogger } from '../__helpers__/mockLogger';
import { MockSegmentStore } from '../__helpers__/mockSegmentStore';

jest.mock('../../uuid');

jest
  .spyOn(Date.prototype, 'toISOString')
  .mockReturnValue('2010-01-01T00:00:00.000Z');

describe('methods #identify', () => {
  const initialUserInfo = {
    traits: {
      name: 'Stacy',
      age: 30,
    },
    userId: 'current-user-id',
    anonymousId: 'very-anonymous',
  };
  const store = new MockSegmentStore({
    userInfo: initialUserInfo,
  });

  const clientArgs = {
    config: {
      writeKey: 'mock-write-key',
    },
    logger: getMockLogger(),
    store: store,
  };

  beforeEach(() => {
    store.reset();
    jest.clearAllMocks();
  });

  it('adds the identify event correctly', () => {
    const client = new SegmentClient(clientArgs);
    jest.spyOn(client, 'process');

    client.identify('new-user-id', { name: 'Mary', age: 30 });

    const expectedEvent = {
      traits: {
        name: 'Mary',
        age: 30,
      },
      userId: 'new-user-id',
      type: 'identify',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);

    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      userId: 'new-user-id',
      traits: expectedEvent.traits,
    });
  });

  it('does not update user traits when there are no new ones provided', () => {
    const client = new SegmentClient(clientArgs);
    jest.spyOn(client, 'process');

    client.identify('new-user-id');

    const expectedEvent = {
      traits: initialUserInfo.traits,
      userId: 'new-user-id',
      type: 'identify',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);

    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      userId: 'new-user-id',
    });
  });

  it('does not update userId when userId is undefined', () => {
    const client = new SegmentClient(clientArgs);
    jest.spyOn(client, 'process');

    client.identify(undefined, { name: 'Mary' });

    const expectedEvent = {
      traits: { name: 'Mary', age: 30 },
      userId: undefined,
      type: 'identify',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);
    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      traits: {
        age: 30,
        name: 'Mary',
      },
    });
  });

  it('does not persist identity traits accross events', () => {
    const client = new SegmentClient(clientArgs);
    jest.spyOn(client, 'process');
    // @ts-ignore accessing the internal timeline to check the processed events
    jest.spyOn(client.timeline, 'process');

    client.identify('new-user-id', { name: 'Mary', age: 30 });

    const expectedEvent = {
      traits: {
        name: 'Mary',
        age: 30,
      },
      userId: 'new-user-id',
      type: 'identify',
    };

    expect(client.process).toHaveBeenCalledTimes(1);
    expect(client.process).toHaveBeenCalledWith(expectedEvent);

    expect(client.userInfo.get()).toEqual({
      ...initialUserInfo,
      userId: 'new-user-id',
      traits: expectedEvent.traits,
    });

    client.track('track event');

    // @ts-ignore
    expect(client.timeline.process).toHaveBeenLastCalledWith({
      anonymousId: 'very-anonymous',
      event: 'track event',
      integrations: {},
      messageId: 'mocked-uuid',
      properties: {},
      timestamp: '2010-01-01T00:00:00.000Z',
      type: 'track',
      userId: 'new-user-id',
    });
  });
});
