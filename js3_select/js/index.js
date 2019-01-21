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
			if (curMachine.states[curMachine.state].onExit !== undefined)
				doStateAction(curMachine, curEvent, curMachine.states[curMachine.state].onExit);
			curMachine.state = newState;
			if (curMachine.states[newState].onEntry !== undefined)
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
		},
		setHandlers() {
			const citySelector = this.context.citySelector;
			const selectorList = this.context.selectorList;
			const containerRadios = this.context.containerRadios;

			document.querySelector('body').addEventListener('click', () => {
				selectorList.style.display = 'none';
				this.context.filter = '';
				this.actions.formSuggestsList;
				const suggestList = this.context.suggestList;
				let flag = false;
				for (let i = 0; i < suggestList.length; ++i) {
					if (citySelector.value == suggestList[i]) {
						flag = true;
						break;
					}
				}
				if (!flag) {
					citySelector.value = '';
				}
			});

			citySelector.addEventListener('keyup', (e) => {
				this.context.filter = citySelector.value;
				this.transition('CHANGE');
				selectorList.style.display = 'block';
				this.context.focusElement = selectorList.firstChild;
				switch(e.keyCode) {
					case 13:
					case 40:
						this.context.focusElement.focus();
				}
			});

			this.context.focusElement.addEventListener('keyup', (e) => {
				switch(e.keyCode) {
					case 13:
						selectorList.style.display = 'none';
						citySelector.value = this.context.focusElement.innerText;
						citySelector.focus();
						break;
					case 40:
						if (this.context.focusElement.nextSibling) {
							this.context.focusElement = this.context.focusElement.nextSibling;
							this.context.focusElement.focus();
						}
						break;
					case 38:
						if (this.context.focusElement.previousSibling) {
							this.context.focusElement = this.context.focusElement.previousSibling;
							this.context.focusElement.focus();
						} else {
							citySelector.focus();
						}
						break;
				}
			});

			containerRadios.addEventListener('change', () => {
				citySelector.value = '';
				this.context.filter = citySelector.value;
				this.transition('CHANGE');
			});

			citySelector.addEventListener('dblclick', () => {
				this.context.filter = citySelector.value;
				this.transition('CHANGE');
				selectorList.style.display = 'block';
				this.context.focusElement = selectorList.firstChild;
				this.context.focusElement.focus();
			});

			selectorList.addEventListener('click', (e) => {
				selectorList.style.display = 'none';
				citySelector.value = e.target.innerText;
			});

			selectorList.addEventListener('mouseover', (e) => {
				this.context.focusElement = e.target;
				this.context.focusElement.focus();
			});
		}
	};
	return stateMachine;
}

function MachineException(message) {
	this.message = message;
}

const selectMachine = machine({
	id: 'select',
	initialState: 'initial',
	context: {
		citySelector: document.querySelector('.modal-form_city_selector'),
		selectorList: document.querySelector('.modal-form_selector_list'),
		containerRadios: document.querySelector('.modal-form_country_radios'),
		focusElement: document.querySelector('.modal-form_selector_list'),
		data: [],
		suggestList: [],
		filter: ''
	},
	states: {
		initial: {
			on: {
				FETCH: {
					service: (event) => {
						let xhr = new XMLHttpRequest();
						xhr.open('GET', event.url, true);
						xhr.send();

						const [context, setContext] = useContext();
						const [state, setState] = useState();

						xhr.onload = function() {
							if (xhr.status != 200) {
							  	alert(xhr.status + ': ' + xhr.statusText);
							} else {
								setContext({data: JSON.parse(xhr.responseText)});
								let newLabel;
								for (let i = 0; i < context.data.length; ++i) {
									newLabel = document.createElement('label');
						    		newLabel.setAttribute('for', i);
						    		newLabel.setAttribute('style', 'width: 200px')
									newLabel.innerHTML = '<input type="radio" name="country"'
										+ 'id=' + i + ' /> ' + context.data[i].name;
									context.containerRadios.appendChild(newLabel);
								}
								let radioBtn = document.getElementById('0');
								radioBtn.setAttribute('checked', 'checked');
								context.citySelector.value = 'Орел';
								setContext({filter: 'Орел'});
								setState('prepared');
							}
						};
					}
				}
			}
		},
		prepared: {
			onEntry: ['formSuggestsList', 'applySuggestList'],
			on: {
				CHANGE: {
					target: 'prepared'
				}
			},
			onExit() {
				const context = useContext()[0];
				let elem = context.selectorList.lastChild;
				while (elem) {
					context.selectorList.removeChild(elem);
					elem = context.selectorList.lastChild;
				} 
			}                       
		}		
	},
	actions: {
		applySuggestList: () => {
			const context = useContext()[0];
			const filter = context.filter.toUpperCase();
			let match = false;
			for (let i = 0; i < context.suggestList.length; ++i) {
				if (!Boolean(filter) || context.suggestList[i].toUpperCase().includes(filter)) {
					let newLi = document.createElement('li');
					newLi.setAttribute('class', 'modal-form_selector_list_el');
					newLi.setAttribute('tabindex', '-1');
					newLi.innerHTML = context.suggestList[i];
					context.selectorList.appendChild(newLi);
					match = true;
				}	
			}
			if (!match) {
				let newLi = document.createElement('li');
				newLi.innerHTML = 'Нет результатов...';
				context.selectorList.appendChild(newLi);
			}
		},
		formSuggestsList: () => {
			const radioArr = document.getElementsByName('country');
			let i;
			for (i = 0; i < radioArr.length; ++i) {
				if (radioArr[i].checked) break;
			}
			const countryChecked = i;
			const [context, setContext] = useContext();
			let suggests = [];
			context.data[countryChecked].areas.forEach(function(item, i, arr) {
				if (item.areas.length)
					for (i = 0; i < item.areas.length; ++i)
						suggests.push(item.areas[i].name);
				else suggests.push(item.name);
			});
			setContext({suggestList: suggests});
		}
	}
})

selectMachine.transition('FETCH', {url: 'https://api.hh.ru/areas'});
selectMachine.setHandlers();