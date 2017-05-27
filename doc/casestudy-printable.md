# RxFiddle case study 1

[Open the Doodle](https://doodle.com/poll/5svpmnunv4gqbkn4)

Thank you for taking the time to participate in this case study, an important part of my thesis. The subject of this case study is the usage of Reactive Programming, and specifically the Reactive Extensions implementation. The answers, code and other data you provide will be processed with great care. See the disclaimer for more details.

If you are reading this in advance of the interview: given you have the time, please send me some code samples of your project containing Rx-code. A single file containing your Rx-expressions with some dummy input data is best.

After this series of interviews I will perform another series, with the aim of validating the effect of the tool. **You can only participate in 1 of these studies**, so please stop reading if you will not participate in the interview below.

## Questions

First I will ask some general questions, and questions about how you use Rx.

1. As a developer in general:
    - How many years of experience do you have?
 	- How would you classify your experience? wizard/expert/medium/beginner/no-experience
 	
- Which implementations of Reactive Programming have you worked with? Think of 
    - which programming language (Java/Scala/JavaScript/etc.),
    - which library (RxJS, RxJava, Elm, etc.),  
    - which versions or year-of-use (eg. RxJava 1 or 2, RxJS 4 (before 2016) or 5 (in 2016+)).

- As a Reactive Programming developer: 
    - How many years of RP experience do you have?
    - How would you classify your experience? wizard/expert/medium/beginner/no-experience
	- What size or kind of projects did you do using RP? large/small/toy-examples
    - Please estimate percentage of your code that is 'reactive'
    - Can you describe what advantage reactive programming brings to your projects?
    - To further understand your experience:
         - (How) do you **modify** reactive code of other developers? refactor / replace
         - (How) do you **test** (your) reactive code (with test schedulers and virtual time)? or how else?
         - (How) do you **debug** reactive code? how? Do you use IDE/debugger? println? tests?
         - What set of operators do you generally use? which you you use, but sparely?
	     - Do you frequently search documentation of Rx? Which operators? Why did you lookup this information, what was unclear?
    - Do you miss any insight during the development of reactive applications?
    - What do you infer from the code first and what aspects of the reactive code remains mostly unclear?

## Coding part 1

Now we will look at some code samples, the ones you provided, and some toy-examples without bugs and some examples including bugs.

1. Looking at the code, please explain or draw what is going on in code sample:
   - What kind of mental model do you have of the observable? Please draw it.
   - Explain what the reactive code does.
   - What is the stream's output?
   - What parts are more difficult to understand?
   - What you think are edge cases in this sample? What would cause fundamental changes if the timing or the input events change?

## Coding part 2

Now I will introduce my tool called RxFiddle. I will show how to use most of it's features. Then we will look at some of the same and some different code samples.

1. Looking at the code, please explain or draw what is going on in code sample:
   - What kind of mental model do you have of the observable? Please draw it.
   - Explain what the reactive code does.
   - What is the stream's output?
   - What parts are more difficult to understand?
   - What you think are edge cases in this sample? What would cause fundamental changes if the timing or the input events change?

- In retrospect, after interacting with RxFiddle:
  - Does this bring any (new) insights about the code?
  - (How) did it help you to explain what the reactive code does?
  - In face of a bug, could you find it in this tool?
  - Where do you see this tool in your day-to-day development?

That was it. Thank you for your cooperation! Feel free to provide me with your e-mailadres if you would like to receive further updates about RxFiddle or my thesis results.

# Disclaimer
The answers, code and other data you provide will be processed with great care. No original data is shared with third parties, and will only be stored on my personal computers for the duration of my thesis. Anonymised data is created from what you provide and is used in the report, in particular:

- *any answers* you provide will be anonymised, removing any references to you, your clients or projects.
- *any code* you provide will be anonymised: it will be replaced with an equal Observable structure and timings, with dummy data in the events, but without any relation to you, the project or your clients. For more details about how I intent to anonymise the code, please ask. Also you can request me to first provide you with - and await your permission for using - the results of anonymising your code before I publish it.
- *any other data* you provide will be anonymised and used only after I receive your consent to use this specific piece of data and in which specific context.
