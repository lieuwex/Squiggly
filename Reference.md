```
message := "kaas"
a := {
	message := "Scopes man"
}
puts(message) # "kaas"
a {
	puts(message) # "Scopes man"
}
```

Scopes
---

`{}`     create a new scope.

`?{}`    create a new lazy scope. (executes on usage)

`??{}`   create a new lazy scope that is rerun every time it's used (comparable with a function in an ordinary language)

`{}&`    create a new scope and run the code asynchroniously. Waits for the result when somebody wants to use the scope.

`?{}&`   alias for `?{}`. When you think about it, it's the same thing.

`??{}&`  creates an async version of `??{}`.

Diving into ~~the deep~~ scopes
---

`a{}`			dives into the scope on variable `a`.

`a(x, y){}`	calls `a` with parameters `x` and `y` and dives into the scope of `a`.

Variables
---

`x := "y"`	creates a variable in the current scope with the name `x` and value `"y"`. Throws an error if `x` is already defined in the current scope.

`x = "y"`		sets the variable `x` of the current scope or any parent scope to the value `"y"`. Throws a reference error if x is not already defined in the current scope or any parent scope.

Example
---

```
x := "yolo"
x = "swag"
x := "cool" # woops! error!
```

This is possible, though:
```
x := "yolo"
x = "swag"
a := {
	x := "cool"
	# The x in scope a isn't the same as the x in the root scope.
	# x is "cool" here
}
# x is still "swag" here, though
```

Hacks
---
`_curScope`
  A reference of the current scope. Yes, you can `_curScope{ _curScope{ _curScope{}}}`.

`_scopeStack`
  References of the scopes from current to old. Yes, you can `_scopeStack[0]{ _scopeStack[0]{} }`.

`_var(scope, varName, val){ val: the value of varName  }`
  Hack variables around, use with caution.
