![tudelft](images/tudelft.png#)
![ordina](images/ordina.png)

Introduction
============

Reactive Programming has been around for many years, and recently
several implementations have surfaced that are now incorporated into
widely used frameworks and in use for many production applications.
However, adapting to the paradigm of Reactive Programming as a developer
is known to take some time. Furthermore, even with basic or advanced
knowledge of an implementation it takes longer to understand existing
Reactive code than simple sequential code. What can really help to
understand the created data flows are diagrams [@weck2016visualizing]
which show how data is received, transformed and emitted at each step.

The scope of this thesis will be Reactive Extensions (Rx) [@msdn_rx],
one of the libraries implementing Reactive Programming which has
implementations in almost every programming language. The main
documentation of Rx [@reactivex] uses Marble
Diagrams [@c9_marblediagrams] for each operator to show the behaviour of
this single operator. These diagrams really complement the name of the
operator and its description, allowing the developer to work-out the
nitty details and pick the right operator for it’s use. They are however
only generated per operator, and are not combined for complete data
flows, showing the full flow through many operators.

In this master’s thesis we will focus on creating complete and
interactive Marble Diagrams for full data flows, automatically, from
sources and from running applications.

Observable structure analysis
-----------------------------

The template for the data flows, encapsulated in Observable in Rx, are
contained in code. By analysing the source code or bytecode these
templates can be extracted. Observables are created by calling several
factory methods on the Observable-class. After creation they can be
passed as variables and can be transformed by applying operators which
generate a new, extended Observable structure. Since Observables are
(immutable) value types they can be used multiple times as a basis to
create new structures, therefore possibly creating a tree of related
Observable structures. This structure is the basis for the
visualisation.

Run-time analysis
-----------------

By analysing the structure we already know through which operators
possible future data will flow. During run-time we can detect this
propagation of data through operators. In Rx the methods onNext, onError
and onComplete propagate data, which can be instrumented to log the
invocation to the visualisation engine. Every event then gets shown as a
marble in the correct Observable axis.

AspectJ: AOP

Generating data
---------------

Testing tools like QuickCheck [@quickcheck] automate test generation by
producing arbitrary input, and by finding test cases that falsify the
test conditions. When a falsification is found QuickCheck tries to
simplify the test data, pruning data which does not attribute to the
tests failure. An equally advanced test tool for data flows would be
interesting, but is not in scope. Generating data however can be
interesting. Visualising the behaviour of Observables without running
the actual program, based solely on the data flow structure and
generated data could provide valuable insight. Learning from QuickCheck,
reducing to pivotal data can show the various edge cases of how a data
flow can evaluate while keeping the amount of cases to be considered
(and interpreted by humans) at a minimum.

Tainting
--------

When looking at the values bubbling through an Observable structure,
values might be produced which are not directly relatable to their
sources. With pointwise transformations the developer can trace each
output back to a single point of input. However, operations that fold
over time might both use new and reuse older values. The relation
between these variables might not be clear over time. One existing
solution to track dependencies between variables is called
tainting [@bell2015dynamic]: by applying a taint to a variable,
dependent variables either get the same taint or a mixture of all the
taints of it’s dependencies. Implementations of tainting like
Phosphor [@bell2014phosphor] can be evaluated and might be interesting
to integrate.

Research Questions
==================

The main research question is:

> Does visualising Reactive Extensions help developers comprehend their
> code and ease the debugging of Observables?

Several smaller questions must be answered to answer the main question:

1.  Structures:

    1.  Can Observables structures be represented in an abstract
        fashion?

    2.  Can we extract Observable structures from source code or
        bytecode?

    3.  Can we extract run-time behaviour of Observables such that it is
        appropriate input to a visualizer / simulation?

    4.  Can we generate smart test input data for Observable structures?

2.  Visualisation:

    1.  Can Marble Diagrams effectively convey structures containing
        more than 1 operator?

3.  Debugger Usability:

    1.  Can our tool (fully) replace traditional print-debugging in
        practice?

    2.  Do developers use automated test data in practice?

    3.  Does our tool improve the development experience when working
        with Rx?

Motivation
==========

Reactive Programming is a different programming model than sequential
programming. Traditional development tools are not completely adequate
for this model: just like Async Programming now has async call stacks in
Chrome, Reactive Programming also needs more tools to make developing
with the technology easier and less painful.

Anecdotal evidence and personal experience suggest developers tend to
just add print and debug statements through the reactive code to get a
sense of the ordering and effects of events over time. This style of
debugging requires constantly changing the source code, adding and
removing print statements on the go. When using dynamic languages this
can be a little annoying, but when using statically typed languages the
recompilation can take long and the process slows down the development.

Another approach - which might be preferable to print-debugging - is
creating tests. However, in large Observable structures there might be
many variation points which would require exponentially many variations
of (minimal) input events to be tested or even to be considered. After a
bug occurs it might be impossible to know in which state the full
Observable was. Therefore exploring the different scenarios in a visual
way might help to reproduce the bug. Especially when giving instant
feedback on how a small change in input changes the output over time, by
using virtual time schedulers.

Sidenote: the above paragraph also presents another option: keeping
track of the state (in a smart & efficient way) and being able to dump
this when something unexpected happens. One problem with this solution
is that something unexpected can also be the absence of an occurrence,
which is not necessarily detectable.

A reason for scoping this to Rx is how wide Rx is used but mainly how
mature it is. The implementation of Rx dates back before 2010 and is
very well thought through while newer frameworks like Reactive Streams
and Bacon.js lack these backgrounds. Rx is very stable and structured,
simplifying the implementation of the prototype. When completed, it can
then be easily extended to many other Reactive Programming
implementations.

Planning
========

Scheme
------

What Deliverable When Start at Ordina - 12th of September, 2016 Thesis
Proposal Thesis Proposal 25th of September Test prototype Prototype
implementation 1st of December Thesis Draft Draft of final report 15th
of March, 2017 Thesis Defense Presentation 15th of April

Risk analysis
-------------

(= still remains to be done)

Openstaande vak IN4306 Literatuurstudie Te grote scope Meijer’s tijd

Contact
-------

  **Student**              **University**            **Ordina**
  ------------------------ ------------------------- --------------------------
  Herman Banken            Prof.dr. H.J.M. Meijer    Joost de Vries
  B.vd.Polweg 498, Delft   EWI HB08.060 / SV         Ringwade 1, Nieuwegein
  06 - 38 94 37 30         -                         06 - 12 89 56 76
  hermanbanken@gmail.com   H.J.M.Meijer@tudelft.nl   Joost.de.Vries@ordina.nl

Supervision details
===================

(= still in draft-state)

Weekly meetings with the company supervisor Joost de Vries Bi-Weekly
meetings with Erik Meijer over Skype

Ordina provides a working place, computer for the thesis, as well as
sparring partners in the form of other students and colleagues of Joost
from Code Star and SMART on the same floor.

Furthermore some ’user’ (developer) tests will need to be executed, to
learn existing workflows; to compare existing workflows to new proposed
workflows; to provide input on the usability of the tools; or to measure
satisfaction with the new tools for which it would also be very
convenient if some employees of Ordina could volunteer.
