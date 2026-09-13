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

export class DestroyEvent extends DistributorEvent {
  constructor() {
    super('destroy');
  }
}

export class WarnEvent extends DistributorEvent {
  constructor(code, payload) {
    super('warn', { code, payload });
  }
}

export { ForkEvent as Fork, DestroyEvent as Destroy, WarnEvent as Warn };
