# Case Study

Goal: Improve Reactive Programming development workflow & comprehension

Case: Reactive Programming using Rx-library

Theory: 
	- Reactive Programming theory
	- Control Flow debugging
	- Software comprehension, Salvaneshi et al.

## Research questions:

- is reactive code from other developers typically well understood?
- how is reactive code understood (without tools like RxFiddle)? 
  - how long does it take?
  - what resources are used?
  - what approach?
- how is reactive code debugged currently?
- ......

## Interview questions:

- in general:
  - how experienced are you as a developer? wizard/expert/medium/beginner/no-experience
  - how many years of experience?

- have you worked with Reactive Programming?

- which language, library, versions?
- how experienced are you as a RP developer? wizard/expert/medium/beginner/no-experience
- how many years of RP experience?
- what kind of projects: large/small/toy-examples?
- please estimate percentage of your code that is 'reactive'
- can you describe what advantage reactive programming brings to your projects?

- (how) do you **modify** reactive code of other developers? refactor / replace
- (how) do you **test** (your) reactive code?
- (how) do you **debug** reactive code? how? IDE/debugger? println? tests?
- what set of operators do you generally use? which you you use, but sparely?

- Explain what is going on in code sample, looking at:
  - subjects own code
  - sample projects
  - custom code with bugs

- after explaining, retrospect:
  - What kind of mental model did you create to explain? draw it
  - What parts are difficult to understand?
  - Do you know the edge cases?

- Do you frequently search documentation of Rx?
  - Which operators? 
  - Why did you lookup this information, what was unclear?
- Do you miss any insight during the development of reactive applications?
- What do you infer from the code first and what aspects of the reactive code remains unclear?

- when looking at RxFiddle
  - explain what you see
  - how can you interact with this model?
- after interacting with RxFiddle
  - does this bring any (new) insights about the code?
  - explain again what the reactive code does. Is it more clear?
  - in face of [a bug], could you find it in this tool?
  - where do you see this tool in your day-to-day development?

## References

Guidelines for conducting and reporting case study research in software engineering research
http://link.springer.com/article/10.1007/s10664-008-9102-8

Experiences from conducting semi-structured interviews in empirical software engineering research - IEEE Xplore
http://ieeexplore.ieee.org/abstract/document/1509301/

Expectations, Outcomes, and Challenges of Modern Code Review - Microsoft Research
https://www.microsoft.com/en-us/research/publication/expectations-outcomes-and-challenges-of-modern-code-review/