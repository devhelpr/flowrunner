#FlowEventRunner

Library to run a flow-graph defined in json, expandable by plugins.

The reason for the existence of this library is reusability. 
When talking about reusability, this usually is from code perspective. 
But throughout the years my conclusion is that the lifespan of code is limited. It will be replaced
by other code either in the same programming language or different programming language.
While often things like business rules/logic, data and application flows are being transerred to this new environment or changed over time.
To prevent completely rewriting code, we can use a simple system using a directed graph defined in json or xml which can be visually represented.
