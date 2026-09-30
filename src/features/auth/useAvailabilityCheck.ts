import { useCallback, useEffect, useRef, useState } from 'react';
import { UserService } from '../../services/userService';

export type AvailabilityState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'available' }
  | { status: 'taken'; message: string }
  | { status: 'error' };

const IDLE: AvailabilityState = { status: 'idle' };

/** How long typing must pause before we ask the server. */
const DEBOUNCE_MS = 500;

/** A request slower than this is not worth waiting for mid-typing. */
const REQUEST_TIMEOUT_MS = 5000;

const TAKEN_MESSAGES = {
  username: 'That username is already taken. Please choose another one.',
  email: 'An account with this email already exists.',
} as const;

export type AvailabilityField = keyof typeof TAKEN_MESSAGES;

/**
 * Asks the server whether a username/email is free while the user types, so a
 * collision surfaces on step 1 instead of after the preferences page.
 *
 * Two details matter here:
 *
 * - Debounced per field, so a request is only sent once typing pauses. Checking
 *   every keystroke would both hammer the endpoint and flag a name the user was
 *   only part-way through typing.
 * - Each in-flight request carries the value it was made for. If the user types
 *   on, a slow response for an old value is discarded instead of overwriting
 *   the verdict for what is now in the box.
 */
export function useAvailabilityCheck() {
  const [states, setStates] = useState<Record<AvailabilityField, AvailabilityState>>({
    username: IDLE,
    email: IDLE,
  });

  const timers = useRef<Record<AvailabilityField, ReturnType<typeof setTimeout> | null>>({
    username: null,
    email: null,
  });
  const requestIds = useRef<Record<AvailabilityField, number>>({ username: 0, email: 0 });
  const mounted = useRef(true);

  useEffect(() => {
    // Must be set here, not only in the ref's initialiser. StrictMode mounts,
    // unmounts, then remounts every effect in development — an effect with only
    // a cleanup body would leave `mounted` stuck at false, silently discarding
    // every response and stranding the field on "checking" for good.
    mounted.current = true;
    return () => {
      mounted.current = false;
      for (const field of ['username', 'email'] as AvailabilityField[]) {
        // Deliberately reading the ref at cleanup time rather than capturing it
        // above: the warning is aimed at DOM node refs, but here the newest
        // timer is exactly the one that needs cancelling.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        if (timers.current[field]) clearTimeout(timers.current[field]);
      }
    };
  }, []);

  /** True while this request is still the one the user is waiting on. */
  const isCurrent = (field: AvailabilityField, requestId: number) =>
    mounted.current && requestIds.current[field] === requestId;

  const run = useCallback(async (field: AvailabilityField, value: string) => {
    const requestId = ++requestIds.current[field];
    setStates(prev => ({ ...prev, [field]: { status: 'checking' } }));

    // Safety net for a request that never comes back. It must *settle* the
    // field rather than merely abandon the response, otherwise a hung lookup
    // leaves the spinner — and the Continue button that waits on it — stuck.
    const timeout = setTimeout(() => {
      if (!isCurrent(field, requestId)) return;
      // Invalidate the in-flight response so it cannot overwrite this.
      requestIds.current[field] += 1;
      setStates(prev => ({ ...prev, [field]: { status: 'error' } }));
    }, REQUEST_TIMEOUT_MS);

    try {
      const result = await UserService.checkAvailability({ [field]: value });
      // Discard anything that is no longer about the current value, and
      // anything that arrived after the component went away.
      if (!isCurrent(field, requestId)) return;

      const entry = result?.[field];
      if (!entry) {
        // Server declined to opine (malformed value). Leave it to the field
        // validator rather than guessing.
        setStates(prev => ({ ...prev, [field]: IDLE }));
        return;
      }

      setStates(prev => ({
        ...prev,
        [field]: entry.available
          ? { status: 'available' }
          : { status: 'taken', message: TAKEN_MESSAGES[field] },
      }));
    } catch {
      if (!isCurrent(field, requestId)) return;
      // A failed lookup must not block the form — `/register` is authoritative.
      setStates(prev => ({ ...prev, [field]: { status: 'error' } }));
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  /**
   * Schedule a check. Call with an empty value to cancel any pending check and
   * reset the field, which is what keeps a stale "taken" verdict from lingering
   * after the user starts correcting it.
   */
  const scheduleCheck = useCallback((field: AvailabilityField, value: string, enabled: boolean) => {
    if (timers.current[field]) {
      clearTimeout(timers.current[field]);
      timers.current[field] = null;
    }
    // Bump the id so any in-flight response for the previous value is ignored.
    requestIds.current[field] += 1;

    if (!enabled || !value.trim()) {
      setStates(prev => ({ ...prev, [field]: IDLE }));
      return;
    }

    timers.current[field] = setTimeout(() => {
      timers.current[field] = null;
      void run(field, value.trim());
    }, DEBOUNCE_MS);
  }, [run]);

  /** Check immediately, e.g. when the field loses focus. */
  const checkNow = useCallback((field: AvailabilityField, value: string, enabled: boolean) => {
    if (timers.current[field]) {
      clearTimeout(timers.current[field]);
      timers.current[field] = null;
    }
    requestIds.current[field] += 1;
    if (!enabled || !value.trim()) {
      setStates(prev => ({ ...prev, [field]: IDLE }));
      return;
    }
    void run(field, value.trim());
  }, [run]);

  const reset = useCallback(() => {
    for (const field of ['username', 'email'] as AvailabilityField[]) {
      if (timers.current[field]) {
        clearTimeout(timers.current[field]);
        timers.current[field] = null;
      }
      requestIds.current[field] += 1;
    }
    setStates({ username: IDLE, email: IDLE });
  }, []);

  return { states, scheduleCheck, checkNow, reset };
}
