# Data constraints

a observable
 - has a constructor & name
 - can have a source
 - can have a method & arguments
 - can have a code location of instantation
 - can be created as an intermediate effect of a operator
 - can have zero, one or more subscriptions

a subscription
 - has a single subject observable
 - can have a destination subscription
 - can have a destination subscription inside another subscription (higher order)

an event
 - has a subscription
 - has a time
 - can have a value
 - has type next/error/complete/dispose/request



AST idea => Observable Construction Tree (OCT)

