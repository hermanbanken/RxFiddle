Abstract
========

TBD

Introduction
============

Software often needs to respond to external events and data flows. For example in interactive applications, for desktop, web and mobile phones, in graphics and in processing sensor data from phones or IoT-devices. We can use Reactive Programming (RP) to express complex reactive behaviour of these applications in a more declarative, intuitive and consise manner than using traditional design patterns. Programs are generally more comprehensible, requiring less programming skills, when created using RP compared to an equal implementation using the Observer design pattern (Johnson et al. [1995](#ref-johnson1995design)), according to Salvaneschi et al. (Salvaneschi et al. [2014](#ref-salvaneschi2014empirical)).

Equal programs are easier to comprehend in RP style, but more complex programs are also easily created using RP. It could be hard to reason about the full behaviour of these programs, several degrees more complex in behaviour than traditional applications.

For example, those complex programs can/will contain faults. Program faults are normally tracked down using two methods: tests and debugging \[find citation\]. \[explain effort for tests & tests alone are not enough\]. When applying a debugger to sequential program execution the premises for control flow are known or computable using the current stack and heap, and the data flow can be followed by traversing down the stack trace. However, in RP events are triggered asynchronously, which resets the stack trace. The reset stack traces can not be traversed back to the previous event. Furthermore, this means previous stack frames containing data related to previous events are not accessible.

Automated analysis to extract information about program structure and execution, and visualisation of the results are widely considered useful for comprehension and Quante et al. (Quante [2008](#ref-quante2008dynamic)) show that using Control Flow Graphs (CFG) is benificial for specific systems.

**Contributions.** In this thesis we will evaluate whether data or control flow graphs aid reactive program comprehension and debugging. Furthermore we present a tool which generates complete and interactive Marble Diagrams for full data flows, automatically, from sources and from running applications.

Motivation
==========

Reactive Programming is a different programming model than sequential programming.

Reactive Programming has been around for many years, and recently several implementations have surfaced that are now incorporated into widely used frameworks and in use for many production applications. What can really help to understand the created data flows are diagrams (Weck and Tichy [2016](#ref-weck2016visualizing)) which show how data is received, transformed and emitted at each step.

When debugging traditional programs the programmer knows that code above the breakpoint is executed, and code below the breakpoint is yet to be executed. When debugging a reactive program no such guarantees exist: the code below the breakpoint might not get executed until another event occurs.

Anecdotal evidence[1] and personal experience suggest developers tend to add print and debug statements through the reactive code to get a sense of the ordering and effects of events over time. This style of debugging requires constantly changing the source code, adding and removing print statements on the go. When using dynamic languages this can be a pain, but more so when using statically typed languages: the recompilation can take long and the process slows down the development.

Another approach is creating tests. However, in large Observable structures there might be many variation points which would require exponentially many variations of (minimal) input events to be tested or even to be considered. After a bug occurs it might be impossible to know in which state the full Observable was.

The scope for this thesis will be limited to Reactive Extensions (Rx) (Microsoft, n.d.), one of the libraries implementing Reactive Programming which has implementations in almost every programming language. Rx is publicly used by Netflix and Microsoft, in high-scale production applications, but more importantly: it is very mature. The implementation of Rx dates back before 2010 and is very well thought through while newer frameworks like Reactive Streams and Bacon.js lack these backgrounds. Rx is very stable and structured, simplifying the implementation of the prototype. When completed, it can then be easily extended to many other Reactive Programming implementations.

Related Work
============

Observable structure analysis
-----------------------------

The templates for the data flows, encapsulated in Observable in Rx, are contained in code. By analysing the source code or bytecode these templates can be extracted. Observables are created by calling several factory methods on the Observable-class. After creation they can be passed as variables and can be transformed by applying operators which generate a new, extended Observable structure. Since Observables are (immutable) value types they can be used multiple times as a basis to create new structures, therefore possibly creating a tree of related Observable structures. This structure is the basis for the visualisation.

Run-time analysis
-----------------

By analysing the structure one can know in advance through which operators possible future data will flow. During run-time this propagation of data through operators can be detected. In Rx the methods onNext, onError and onComplete propagate data, which can be instrumented to log the invocation to the visualisation engine. Every event then gets shown as a marble in the correct Observable axis.

To instrument code several technologies are available, for Java: For example [ASM](http://asm.ow2.org) (Bruneton, Lenglet, and Coupaye [2002](#ref-bruneton2002asm); Kuleshov [2007](#ref-kuleshov2007using)), which offers very low level bytecode rewriting, or [AspectJ](http://www.eclipse.org/aspectj/) (Kiczales et al. [2001](#ref-kiczales2001overview)) which leverages AOP (Kiczales et al. [1997](#ref-kiczales1997aspect)) to provide a high level interface to add logic to existing methods. Either of these libraries will be used to setup the run-time analysis, depending on which enables our requirements and is the easiest to implement.

Visualisation
-------------

The de-facto standard to visualise Observables is called a Marble Diagram (Wes Dyer and Gogh, n.d.). The ReactiveX documentation (“ReactiveX.io,” n.d.) contains these diagrams, for single operators. These diagrams really complement the name of the operator and its description, allowing the developer to work-out the nitty details and pick the right operator for it’s use. They are however only generated per operator, and are not combined for complete data flows, showing the full flow through many operators. The diagrams in the documentation originate from RxJava and are drawn in [Omnigraffle](https://www.omnigroup.com/omnigraffle).

While the diagrams in the official documentation are static, some efforts exist to generate these diagrams automatically. [RxMarbles.com](http://RxMarbles.com) is a website which allows the user to drag and reorder events in for almost all Observable operators, live updating the corresponding diagram. [RxVision](https://github.com/jaredly/rxvision) on the other hand visualises full structures. It offers a code editor where one can type JavaScript using RxJs and RxVision will visualise the structure created in the editor. RxVision injects code into the RxJS source which extracts the structure, subscriptions and flowing data. While RxVision is a great step in the right direction, it does not integrate into development environments as of September 2016: it requires the code to be placed in the online editor.

At some time Microsoft offered a “Marble Diagram Generator" and [RxSandbox](http://mnajder.blogspot.nl/2010/03/rxsandbox-v1.html), which were Windows applications which - looking at Google’d images - had a catalogue of standard operators and a sandbox to generate custom diagrams. However, the source of these tools is not available and the download links are broken.

Generating data
---------------

Testing tools like QuickCheck (Claessen [2000](#ref-quickcheck)) automate test generation by producing arbitrary input, and by finding test cases that falsify the test conditions. When a falsification is found QuickCheck tries to simplify the test data, pruning data which does not attribute to the tests failure. An equally advanced test tool for data flows would be interesting, and is an interesting further research topic. Generating data however can be interesting. Visualising the behaviour of Observables without running the actual program, based solely on the data flow structure and generated data could provide valuable insight. Learning from QuickCheck, reducing to pivotal data can show the various edge cases of how a data flow can evaluate while keeping the amount of cases to be considered (and interpreted by humans) at a minimum.

Tainting
--------

When looking at the values bubbling through an Observable structure, values might be produced which are not directly relatable to their sources. With pointwise transformations the developer can trace each output back to a single point of input. However, operations that fold over time might both use new and reuse older values. The relation between these variables might not be clear over time. One existing solution to track dependencies between variables is called tainting (Bell and Kaiser [2015](#ref-bell2015dynamic)): by applying a taint to a variable, dependent variables either get the same taint or a mixture of all the taints of it’s dependencies. Implementations of tainting like Phosphor (Bell and Kaiser [2014](#ref-bell2014phosphor)) can be evaluated and might be interesting to integrate.

Research Questions
==================

The main research question is:

> Does visualising reactive programs help developers comprehend their code and ease the debugging of Observables?

Several smaller questions must be answered to answer the main question:

1.  Structures:

    1.  Can Observable structures be represented in an abstract fashion?

    2.  Can Observable structures be extracted from source code or bytecode?

    3.  Can run-time behaviour of Observables be extracted such that it is appropriate input to a visualizer / simulation?

    4.  Can ‘smart’ ( \[sec:gen-data\]) test input data for Observable structures be generated?

2.  Visualisation:

    1.  \[qstn:marble\] Can Marble Diagrams effectively convey structures containing more than 1 operator?

3.  Debugger Usability:

    1.  \[qstn:println\] Can our tool (fully) replace traditional print-debugging in practice?

    2.  \[qstn:autogen\] Do developers use automated test data in practice?

    3.  \[qstn:experience\] Does our tool improve the development experience when working with Rx?

Planning
========

Scheme
------

A preliminary planning is defined as:

| **What**                    | **When**                |
|:----------------------------|:------------------------|
| Start of project, at Ordina | 12th of September, 2016 |
| Research Proposal ready     | 25th of September, 2016 |
| Test prototype 1            | 2nd of December, 2016   |
| User test 1                 | 5th of December, 2016   |
| Test prototype 2            | 20th of Januari, 2017   |
| User test 2                 | 23th of Januari, 2017   |
| Draft of final report       | 15th of March, 2017     |
| Thesis Defense              | 15th of April, 2017     |

Contact
-------

| **Student**                     |
|:--------------------------------|
| Herman Banken                   |
| Balthasar van der Polweg, Delft |
| 06 - 38 94 37 30                |
| hermanbanken@gmail.com          |

| **Ordina**               | **University**     | **University**          |
|:-------------------------|:-------------------|:------------------------|
| Joost de Vries           | Georgios Gousios   | Prof.dr. H.J.M. Meijer  |
| Ringwade 1, Nieuwegein   | EWI HB08.xxx       | EWI HB08.060 / SV       |
| Joost.de.Vries@ordina.nl | gousiosg@gmail.com | H.J.M.Meijer@tudelft.nl |

Supervision details
-------------------

The thesis project will take place mainly at Ordina, and partly at the Delft Technical University. Ordina provides a working place, computer for the thesis, as well as sparring partners in the form of other students and colleagues of Joost from Code Star and SMART on the same floor.

To discuss the progress several meetings are scheduled:

1.  Weekly meetings with the company supervisor Joost de Vries.

2.  Weekly meetings with Georgios Gousios in Delft, or over video chat.

3.  Bi-Weekly meetings with Erik Meijer over video chat.

Furthermore some ’user’ (developer) tests will need to be executed,

-   to learn existing workflows;

-   to compare existing workflows to new proposed workflows;

-   to provide input on the usability of the tools;

-   or to measure satisfaction with the new tools

for which it would also be very convenient if some employees of Ordina could volunteer.

Risk analysis
-------------

The project is subject to several risks, discussed here.

The first risks are internal to the project. The scope described in and \[sec:questions\] is quite challenging. The visualisation part could be a thesis topic on it’s own. However, due to previous and available work in projects like RxVision and RxMarbles, the time required for implementation is at least limited. The existing visualisation of RxVision might prove to be not ideal, and RxMarbles is not as complete as RxVision, so some additional work might be required to create an optimal visualisation. This would be perfecting the tool however, and does not need be part of the academic thesis.

Secondly the project needs a case study and user test to fully test the effectiveness of the debug methodology. User studies are a risk since the organisation of the test event depends on many people. By doing the thesis at Ordina this risk is at least limited, as there are many developers present, on location, of which only a subset needs to be available.

External risks are other courses that need to be finished. As of September 2016 only 7 ECTS need to be completed, not regarding the 45 ECTS of the thesis itself. I’m currently still working on ‘IN4306 Literature Study’ (10 ECTS) on a somewhat related but more general subject of ‘Reactive Programming’. The remaining work is limited, but - at the very latest - needs to be completed before the defense. The literature study will not take up time from the thesis, as I plan to do this in the weekend and evenings.

Finally, a risk is the time of the people involved, especially professor Meijer. Meijer works a full-time job at Facebook, as of September 2016, and his professorship is only part-time. To remedy this risk an additional supervisor in the person of Georgios Gousios was contacted. Georgios will function as the default university contact, while Meijer will provide valuable input where possible.

User tests and prototypes
-------------------------

The research question in general, and specifically subquestions\[qstn:marble\],\[qstn:println\],\[qstn:autogen\] and\[qstn:experience\] touch the man-machine-interaction and psychology sides of Computer Science. The appropriate way to answer these questions would be (one or more) case studies and user tests.

The planning mentions the completion of two prototypes and subsequent user tests. The final feature-set of these prototypes can not yet be determined, but a preliminary specification is given here.

### User tests

To evaluate questions\[qstn:println\] and\[qstn:experience\] the tool needs to be working on all levels of the implementation. Both the gathering of data as visualisation need to work. Not every feature of Rx needs to be supported, but to test the experience at least common use cases - that developers can relate to - should be fully debuggable. As this requires the bulk of work, these questions will be addressed in the second test.

Question\[qstn:marble\] can be tested using the visualisation part only. Building on the existing [RxMarbles.com](http://rxmarbles.com) the visualisation will be created for some scripted examples. A user test can then verify that the visualisation is comprehensible and clear. To test the debugging usability of the visualisation a bug can be introduced in code, and the corresponding visualisation should then be used to localise the bug. The visualisation part is the only requirement for the test, so this question will be addressed in the first test.

The last question\[qstn:autogen\] is self-contained, and builds upon the visualiser. Depending on the progress made, the implementation of auto-generation of tests can be considered or postponed. Preferably this feature would be part of prototype 1, to better distribute the tests.

### Prototypes

The list of features for the prototypes then becomes:

1.  1.  Visualiser for Observable sequence with multiple subsequent operations

    2.  Interactive input sequences

    3.  Live updating events in subsequent sequences

    4.  Optionally, ‘smart’ test event generation

2.  1.  Static analysis collector for structures in code

    2.  Runtime analysis collector for events in Observable sequences

    3.  Interface to select ‘root’ Observable: which Observable to use as starting point for the visualisation

    4.  Interface to switch between runtime events and (interactive/generated) test events

    5.  ‘Smart’ test event generation, if not done in prototype 1.

Bell, Jonathan, and Gail Kaiser. 2014. “Phosphor: Illuminating Dynamic Data Flow in Commodity Jvms.” In *ACM Sigplan Notices*, 49:83–101. 10. ACM.

———. 2015. “Dynamic Taint Tracking for Java with Phosphor.” In *Proceedings of the 2015 International Symposium on Software Testing and Analysis*, 409–13. ACM.

Bruneton, Eric, Romain Lenglet, and Thierry Coupaye. 2002. “ASM: A Code Manipulation Tool to Implement Adaptable Systems.” *Adaptable and Extensible Component Systems* 30: 19.

Claessen, John, Koen; Hughes. 2000. “QuickCheck: A Lightweight Tool for Random Testing of Haskell and Programs.” In. doi:[ng](https://doi.org/ng).

Johnson, Ralph, Erich Gamma, Richard Helm, and John Vlissides. 1995. “Design Patterns: Elements of Reusable Object-Oriented Software.” *Boston, Massachusetts: Addison-Wesley*.

Kiczales, Gregor, Erik Hilsdale, Jim Hugunin, Mik Kersten, Jeffrey Palm, and William G Griswold. 2001. “An Overview of Aspectj.” In *European Conference on Object-Oriented Programming*, 327–54. Springer.

Kiczales, Gregor, John Lamping, Anurag Mendhekar, Chris Maeda, Cristina Lopes, Jean-Marc Loingtier, and John Irwin. 1997. “Aspect-Oriented Programming.” In *European Conference on Object-Oriented Programming*, 220–42. Springer.

Kuleshov, Eugene. 2007. “Using the Asm Framework to Implement Common Java Bytecode Transformation Patterns.” *Aspect-Oriented Software Development*.

Microsoft. n.d. “Reactive Extensions (Rx).” <https://msdn.microsoft.com/en-us/data/gg577609.aspx>. <https://msdn.microsoft.com/en-us/data/gg577609.aspx>.

Quante, Jochen. 2008. “Do Dynamic Object Process Graphs Support Program Understanding?-a Controlled Experiment.” In *Program Comprehension, 2008. Icpc 2008. the 16th Ieee International Conference on*, 73–82. IEEE.

“ReactiveX.io.” n.d. <http://reactivex.io/>. <http://reactivex.io/>.

Salvaneschi, Guido, Sven Amann, Sebastian Proksch, and Mira Mezini. 2014. “An Empirical Study on Program Comprehension with Reactive Programming.” In *Proceedings of the 22Nd Acm Sigsoft International Symposium on Foundations of Software Engineering*, 564–75. ACM.

Weck, Tobias, and Matthias Tichy. 2016. “Visualizing Data-Flows in Functional Programs.” In *2016 Ieee 23rd International Conference on Software Analysis, Evolution, and Reengineering (Saner)*, 1:293–303. IEEE; Institute of Electrical & Electronics Engineers (IEEE). doi:[10.1109/saner.2016.82](https://doi.org/10.1109/saner.2016.82).

Wes Dyer, Erik Meijer, and Jeffrey van Gogh. n.d. “Reactive Extensions API in Depth: Marble Diagrams, Select & Where.” <https://channel9.msdn.com/blogs/j.van.gogh/reactive-extensions-api-in-depth-marble-diagrams-select--where>. <https://channel9.msdn.com/blogs/j.van.gogh/reactive-extensions-api-in-depth-marble-diagrams-select--where>.

[1] http://staltz.com/how-to-debug-rxjs-code.html
