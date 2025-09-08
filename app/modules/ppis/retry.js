export function retryUntil(getterFn, { tries = 20, delay = 300 } = {}) {
    return new Promise((resolve) => {
      let attempt = 0;
      const tick = async () => {
        try {
          const val = await getterFn();
          if (val) return resolve(val);
        } catch (_) { /* ignore */ }
        if (++attempt >= tries) return resolve(null);
        setTimeout(tick, delay);
      };
      tick();
    });
  }
  