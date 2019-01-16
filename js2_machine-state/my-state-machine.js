const machineCallStack = [];

function useContext() {
	const curMachine = machineCallStack[machineCallStack.length - 1][0];
	return [curMachine.context, (newContext) => {Object.assign(curMachine.context, newContext);}];
}

function useState() {
	const curMachine = machineCallStack[machineCallStack.length - 1][0];
	const curEvent = machineCallStack[machineCallStack.length - 1][1];
	return [curMachine.state, (newState) => {
		if (curMachine.states[newState] === undefined)
			throw new MachineException('Error! Unknown state!');
		try {
			doStateAction(curMachine, curEvent, curMachine.states[curMachine.state].onExit);
			curMachine.state = newState;
			doStateAction(curMachine, curEvent, curMachine.states[newState].onEntry);
		} catch (e) {
			console.log(e.message);
		}
	}];
}

function fillStack(machine, event, func) {
	machineCallStack.push([machine, event]);
	func(event);
	machineCallStack.pop();
}

function doStateAction(curMachine, event, stateAction) {
	if (typeof(stateAction) === "function") {
		fillStack(curMachine, event, stateAction);
	} else if (typeof(stateAction) === "string") {
		if (curMachine.actions[stateAction] === undefined) {
			throw new MachineException('Error! Unknown action!');
		}
		fillStack(curMachine, event, curMachine.actions[stateAction]);
	} else if (typeof(stateAction) === typeof([0])) {
		for (let action in stateAction) {
			let act = stateAction[action];
			if (curMachine.actions[act] === undefined) {
				throw new MachineException('Error! Unknown action!');
			}
			fillStack(curMachine, event, curMachine.actions[act]);
		}
	} else {
		throw new MachineException('Error! Unknown type of state action!');
	}
}

function machine(newMachine) {
	const stateMachine = {
		id: newMachine.id,
		state: newMachine.initialState,
		context: newMachine.context,
		states: newMachine.states,
		actions: newMachine.actions,
		transition(transaction, event) {
			if (this.states[this.state].on === undefined) 
				throw new MachineException('Error! Current state doesn`t have field "on"!');
			const trans = this.states[this.state].on[transaction];
			if (trans === undefined) throw new MachineException('Error! Unknown transaction!');
			if (trans.service !== undefined) {
				fillStack(this, event, trans.service);
			} else if (trans.target !== undefined) {
				machineCallStack.push([this, event]);
				const [state, setState] = useState();
				setState(trans.target);
				machineCallStack.pop();
			} else throw new MachineException('Error! Transaction must have field "service" or "target"!');
			return 0;
		}
	};
	return stateMachine;
}

function MachineException(message) {
	this.message = message;
}

// **************************	TESTS	************************
// № 1. Machine from StateMachinePseudoApi.
const vacancyMachine = machine({
	id: 'vacancy',
	initialState: 'notResponded',
	context: {id: 1},
	states: {
		responded: {
			onEntry: 'onStateEntry'
		},
		notResponded: {                        
			onExit() {
				console.log('1 we are leaving notResponded state');
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
			console.log('1 now state is ' + state);
		},
		makeResponse: () => {
			setTimeout(() => {
				console.log("Response.");
			}, 1000);
		}
	}
})

// № 2. State action is array.
const vacancyMachine1 = machine({
	id: 'vacancy',
	initialState: 'notResponded',
	context: {id: 2},
	states: {
		responded: {
			onEntry: ['onStateEntry', 'makeResponse']
		},
		notResponded: {                        
			onExit() {
				console.log('2 we are leaving notResponded state');
			},
			on: {
				RESPOND: {
					service: (event) => {
						const [context, setContext] = useContext();
						const [state, setState] = useState();
						setTimeout(() => {
							setState('responded');
							setContext({completed: true});
						}, 3000);
					},
					target: 'responded'
				}
			}
		}		
	},
	actions: {
		onStateEntry: (event) => {
			const [state] = useState();
			console.log('2 now state is ' + state);
		},
		makeResponse: () => {
			setTimeout(() => {
				console.log("2 Response.");
			}, 1000);
		}
	}
})

// № 3. Without service.
const vacancyMachine2 = machine({
	id: 'vacancy',
	initialState: 'notResponded',
	context: {id: 1},
	states: {
		responded: {
			onEntry: 'onStateEntry'
		},
		notResponded: {                        
			onExit() {
				console.log('3 we are leaving notResponded state');
			},
			on: {
				RESPOND: {
					target: 'responded'
				}
			}
		}		
	},
	actions: {
		onStateEntry: (event) => {
			const [state] = useState();
			console.log('3 now state is ' + state);
		}
	}
})

console.log('Test 1. Machine from StateMachinePseudoApi:');
vacancyMachine.transition('RESPOND', {resume: {name: 'Vasya', lastName: 'Pupkin'}});
console.log('Test 2. State action is array:');
vacancyMachine1.transition('RESPOND', {resume: {name: 'Vasya', lastName: 'Pupkin'}});
console.log('Test 3. Without service:');
vacancyMachine2.transition('RESPOND', {resume: {name: 'Vasya', lastName: 'Pupkin'}});
