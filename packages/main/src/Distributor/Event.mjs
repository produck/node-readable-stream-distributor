export class DistributorEvent extends CustomEvent {
  constructor(type, detail) {
    super(type, { detail });
  }
}

export class ForkEvent extends DistributorEvent {
  constructor(forked) {
    super('fork', { forked });
  }
}

export class TerminateEvent extends DistributorEvent {
  constructor() {
    super('terminate');
  }
}

export class WarnEvent extends DistributorEvent {
  constructor(code, payload) {
    super('warn', { code, payload });
  }
}

export { ForkEvent as Fork, TerminateEvent as Terminate, WarnEvent as Warn };
