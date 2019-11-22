# challenge-one

A simple key/value store CLI using only the core Node API.

## Installation

1. Clone this repo
2. Add this repo to your PATH environment variable or place the directory in your existing PATH
3. Issue the command `store`

Alternatively, you may also execute the `store` file directly in all the usual ways with `./`, `npx`, `node`, etc.

## Store API

### Add

`$ store add mykey myvalue`

Add a value to the store, if the key exists, nothing is done. To replace a value, first call `remove`.

### List

`$ store list`

Returns a list of all keys in the store:

```
$ store add test test
$ store add 今日は q
$ store list
test
今日は
```

### Get

Returns values from the store:

```
$ store add test test value
$ store get test
Value for key "test":
test value

```

Can get values for multiple keys:

```
$ store add test1 test value 1
$ store add test2 test value 2
$ store get test
Value for key "test1":
test value 1

Value for key "test2":
test value 2

```

### Remove

Removes any number of items from the store:

```
$ store add test test value
$ store add test2 test value 2
$ store list
test
test2
$ store remove test test2
$ store list
```

## Cache storage and clearing the store

The store data is located in the `.cache` folder of the root directory where the application lives. To clear your store
simply delete the `.cache` directory.
