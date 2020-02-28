# FlowEventRunner

Library to run a flow-graph defined in json, expandable by plugins and hooks.

The reason for the existence of this library is reusability. 
When talking about reusability, this usually is from code perspective. 
But throughout the years my conclusion is that the lifespan of code is limited. It will be replaced by other code either in the same programming language or in a different programming language in new environments within a relative short period of time.
While often things like business rules/logic, data and application flows are being transferred to new code environments while the actual rules/logic/flows stay the same.

The question that I asked myself is: can this be avoided if we represent these rules/logic in a different way then in code? A possible solution for this is a conditional directed graph consisting of simple properties and data types which can be represented in json or xml and shown visually on screen. The graph represents the control flow of typical software applications. Instead of relying on code to represent and handle the connection between the components of a software application, this is represented by the graph.
This graph should be executed by generic and extendable code.

That is what this package is the starting point for : run a flow of node's where every node has a specific task attached. A set of basic tasks already exists and can be further extended.
Offcourse this implementation is in Javascript (written in typescript), but the same principle should be transferable to other programming languages like C#, PHP, Rust, ReasonML, Swift and/or Kotlin.

Currently the focus is on building the core set of packages and getting the right set of functionality with correct naming of api methods and properties and testing it with real life use-cases.

The package won't be stable until v1... before that time don't use these packages in production code.

