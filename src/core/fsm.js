/**
 * Generic finite state machine engine.
 */

export function createFSM(config) {
  const { transitions, onEnter = {}, onExit = {} } = config;

  return Object.freeze({
    /**
     * Attempt a transition from the current state via the given action.
     * Returns { newState, valid } where valid indicates if transition was allowed.
     */
    transition(currentState, action, context) {
      const stateTransitions = transitions[currentState];
      if (!stateTransitions) {
        return { newState: currentState, valid: false };
      }

      const transitionDef = stateTransitions[action];
      if (!transitionDef) {
        return { newState: currentState, valid: false };
      }

      // Support conditional transitions via guard functions
      if (typeof transitionDef === 'function') {
        const result = transitionDef(context);
        if (result === null || result === undefined) {
          return { newState: currentState, valid: false };
        }
        const targetState = result;

        // Run exit/enter callbacks
        if (onExit[currentState]) {
          onExit[currentState](context);
        }
        if (onEnter[targetState]) {
          onEnter[targetState](context);
        }

        return { newState: targetState, valid: true };
      }

      // Simple string transition
      const targetState = transitionDef;
      if (onExit[currentState]) {
        onExit[currentState](context);
      }
      if (onEnter[targetState]) {
        onEnter[targetState](context);
      }

      return { newState: targetState, valid: true };
    },

    /**
     * Get available actions from a given state.
     */
    getActions(currentState) {
      const stateTransitions = transitions[currentState];
      return stateTransitions ? Object.keys(stateTransitions) : [];
    },
  });
}
