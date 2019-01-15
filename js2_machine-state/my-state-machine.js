let curMachine;
let curEvent;

function useContext() {
	return [curMachine.context, (newContext) => {Object.assign(curMachine.context, newContext);}];
}

function useState() {
	return [curMachine.state, (newState) => {
		if (curMachine.states[newState] === undefined) {
			throw new MachineException('Error! Unknown state!');
		}
		try {
			doStateAction(curMachine.states[curMachine.state].onExit);
			curMachine.state = newState;
			doStateAction(curMachine.states[curMachine.state].onEntry);
		} catch (e) {
			console.log(e.message);
		}
	}];
}

function doStateAction(stateAction) {
	if (typeof(stateAction) === "function") {
		stateAction(event);
	} else if (typeof(stateAction) === "string") {
		if (curMachine.actions[stateAction] === undefined) {
			throw new MachineException('Error! Unknown action!');
		}
		curMachine.actions[stateAction](event);
	} else if (typeof(stateAction) === typeof([0])) {
		for (let action in stateAction) {
			let act = stateAction[action];
			if (curMachine.actions[act] === undefined) {
				throw new MachineException('Error! Unknown action!');
			}
			curMachine.actions[act](event);
		}
	} else {
		throw new MachineException('Error! Unknown type of state action!');
	}
}

function MachineException(message) {
		this.message = message;
}

function machine(newMachine) {
	const stateMachine = {
		id: newMachine.id,
    state: newMachine.initialState,
    context: newMachine.context,
    states: newMachine.states,
    actions: newMachine.actions,
    transition(transaction, event) {
    	if (this.states[this.state].on === undefined) {
    		throw new MachineException('Error! Current state doesn`t have field "on"!');
    	}
    	const trans = this.states[this.state].on[transaction];
    	if (trans === undefined) {
    		throw new MachineException('Error! Unknown transaction!');
    	}
    	curMachine = this;
    	curEvent = event;
    	if (trans.service !== undefined) {
    		trans.service(event);
    	} else if (trans.target !== undefined) {
    		const [state, setState] = useState();
    		setState(trans.target);
    	} else {
    		throw new MachineException('Error! Transaction must have field "service" or "target"!');
    	}
    	return 0;
    }
	};
	return stateMachine;
}

// TESTS
// № 1. No field 'on'.
const vacancyMachine0 = machine({
	id: 'vacancy',
	initialState: 'responded',
	context: {id: 0},
	states: {
		responded: {
			onEntry: 'onStateEntry'
		},
		notResponded: {                       
			onExit() {
				console.log('we are leaving notResponded state');
			}
		}
	}, 
	actions: {
    onStateEntry: (event) => {
      const [state] = useState();
		  console.log('now state is ' + state);
	  }
	}
})

try {
	vacancyMachine0.transition('BAK', {resume: {name: 'Vasya', lastName: 'Pupkin'}});	
} catch (e) {
			console.log('Test 1:');
			console.log(e.message);
}

// № 2. Unknown transaction.
const vacancyMachine1 = machine({
	id: 'vacancy',
	initialState: 'notResponded',
	context: {id: 1},
	states: {
		responded: {
			onEntry: 'onStateEntry'
		},
		notResponded: {                       
			on: {
        // Транзакция
				RESPOND: {          
				  target: 'responded'
				}
			}
		}
	}, 
	actions: {
    onStateEntry: (event) => {
      const [state] = useState();
		  console.log('now state is ' + state);
	  }
	}
})

try {
	vacancyMachine1.transition('SMTH', {resume: {name: 'Vasya', lastName: 'Pupkin'}});	
} catch (e) {
			console.log('Test 2:');
			console.log(e.message);
}

// № 3. Without service.
console.log('Test 3:');
vacancyMachine1.transition('RESPOND', {resume: {name: 'Vasya', lastName: 'Pupkin'}});

// № 4. State action is array.
const vacancyMachine2 = machine({
	id: 'vacancy',
	initialState: 'notResponded',
	context: {id: 2},
	states: {
		responded: {
      // action, который нужно выполнить при входе в это состояние. Можно задавать массивом, строкой или функцией
			onEntry: ['onStateEntry', 'makeResponse']
		},
		notResponded: {                        
			onExit() {
				console.log('we are leaving notResponded state');
			},
			on: {
				RESPOND: {
          service: (event) => {
            const [context, setContext] = useContext();
            const [state, setState] = useState();
            setTimeout(() => {
            	setState('responded');
              setContext({completed: true});
            }, 1000);
          },
          target: 'responded'
        }
			}
		}		
	},
	actions: {
    onStateEntry: (event) => {
      const [state] = useState();
		  console.log('now state is ' + state);
	  },
	  makeResponse: (event) => {
      setTimeout(() => {
      	console.log("Response.");
      }, 1000);
    }
	}
})

console.log('Test 4:');
vacancyMachine2.transition('RESPOND', {resume: {name: 'Vasya', lastName: 'Pupkin'}});