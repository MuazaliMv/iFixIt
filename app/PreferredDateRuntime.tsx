'use client';

/**
 * Scheduling was removed from the customer request flow.
 *
 * This runtime intentionally does nothing. Keeping the module as a no-op
 * avoids breaking existing imports while ensuring a hidden date input can
 * no longer become required and block STANDARD/URGENT request submission.
 */
export default function PreferredDateRuntime(){
  return null;
}
