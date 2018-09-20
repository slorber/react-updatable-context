NOTE: I created this tool, but this is basically an inferior version of [Unstated](https://github.com/jamiebuilds/unstated) that you should use instead. If you need an HOC for unstated you can create one easily on top of the render prop api:

```js
export const connectContainer = (
  Container,
  mapContainerToProps = () => null,
) => WrappedComponent => {
  const PureWrappedComponent = pure(WrappedComponent);
  const ConnectedComponent = ownProps => (
    <Subscribe to={[Container]}>
      {container => {
        const mappedProps = mapContainerToProps(container, ownProps);
        //console.debug('mappedProps', mappedProps, container);
        return (
          <PureWrappedComponent
            {...mappedProps}
            {...ownProps} // own props can always overrides connected props
          />
        );
      }}
    </Subscribe>
  );

  ConnectedComponent.displayName = `connectContainer(${getDisplayName(
    WrappedComponent,
  )})`;

  return ConnectedComponent;
};
```



React Updatable Context
==========================

Sometimes it's annoying to have to manage the state outside of the Provider. 

Sometimes we just want to make the Provider stateful and be able to update it from Consumers.

The React context API is a low-level API, it permits to pass down a value to a component tree and that's it. 
This library tries to build new primitives on this API so that it's easier to use context in real life applications.

```
yarn add react-updatable-context
npm install react-updatable-context
```

# Examples

Let's first define a very simple language selector component, and in the following examples we'll see how to connect this stateless component to our context.

```jsx harmony
const LanguageSelector = ({language, updateLanguage}) => (
  <div>
    <div>Current language: {language}</div>
    <div onClick={() => updateLanguage("french")}>Switch to french</div>
    <div onClick={() => updateLanguage("english")}>Switch to english</div>
  </div>
);
```



### Simple example

```jsx harmony

import { createUpdatableContext } from 'react-updatable-context';

const { 
  Provider: LanguageProvider, 
  Consumer: LanguageConsumer,
} = createUpdatableContext(); 

// Add the provider to your app like with normal Context api
const MyApp = () => (
  <LanguageProvider 
    initialValue={"english"} 
    beforeChange={(newLanguage,oldLanguage) => console.log("Language will be updated",newLanguage,oldLanguage)}
    afterChange={(newLanguage,oldLanguage) => console.log("Language has been updated",newLanguage,oldLanguage)}
  >
    <Router/>
  </LanguageProvider>
);

// Use the consumer like normal Context api, but it also receives a 2nd parameter
const AppLanguageSelector = () => (
  <LanguageConsumer>
    {(value, update) => (
      <LanguageSelector language={value} updateLanguage={update} />
    )}
  </LanguageConsumer>
)
``` 




### Managing your global app state with Context

Sometimes the level of indirection with events/actions, and tools like Redux, is too much. 
Using a simple global state API on top of Context can be good enough for many apps.

But... We don't want to expose the state structure to deeply nested components. 

`createSubConsumer` and `connect` are here for that.


```jsx harmony

import { createUpdatableContext } from 'react-updatable-context';

const {
  Provider, 
  Consumer,
  createSubConsumer,
  connect,
 } = createUpdatableContext({
  defaultValue: null, // You can set default value, like regular React context
}); 


const MyApp = () => (
  <Provider 
    initialValue={{
      language: "english",
      unreadChatCount: 0,
    }} 
  >
    <Router/>
  </Provider>
);


// Then you can use the global consumer directly, but your component is aware of the global state structure
const AppLanguageSelector = () => (
  <Consumer>
    {(value, update) => (
      <LanguageSelector 
        language={value.language} 
        updateLanguage={language => update({language})} 
      />
    )}
  </Consumer>
);

// You can use a "sub consumer" which will refine the value/update api so that you can only get/set the language
const LanguageConsumer = createSubConsumer(
  value => value.language, // mapValue (1st arg), it's a "selector" so you can use reselect if you want
  update => language => update({language}), // mapUpdate (2nd arg)
);

// Then you can write this instead, which expose less internal state structure
const AppLanguageSelector = () => (
  <LanguageConsumer>
    {(value, update) => (
      <LanguageSelector 
        language={value} 
        updateLanguage={update} 
      />
    )}
  </LanguageConsumer>
);

// You can also use `connect` if you prefer HOCs and an API similar to react-redux
const AppLanguageSelector = connect(
  (value,update) => ({
    language: value.language,
    updateLanguage: language => update({language}),
  }),
)(LanguageSelector)
``` 


### Performance and pure components

For performance reasons, we want to inject stable callbacks when connecting to components.

On every global state changes, all the consumers will be invoked, and we don't want pure components that consume only a small amount of state to render unnecessarily.

For that, it is possible to create the callbacks only once, at creation time.
 
Somehow, you are defining an update API that will replace the raw low-level update API that is injected as the 2nd arg of the consumer

```jsx harmony
const {
  // ...
  connect,
 } = createUpdatableContext({
  defaultValue: null,
  
  // This creates an "update API"
  mapUpdate: (update,getValue) => ({
    updateLanguage: language => update({language}),
    incrementUnreadChatCount: () => update({unreadChatCount: getValue().unreadChatCount + 1}),
  }),
}); 

// Then you can connect with a stable callback:
const AppLanguageSelector = connect(
  (value,updateApi) => ({
    language: value.language,
    updateLanguage: updateApi.updateLanguage,
  }),
)(LanguageSelector)

// Or with a sub-consumer
const LanguageConsumer = createSubConsumer(
  value => value.language,
  updateApi => language => updateApi.updateLanguage(language),
);
```

### Using a reducer

TODO reducer/dispatch example for those liking evented systems

### Using async update functions

TODO

### Optimistic updates

TODO



# FAQ

### Is this another state management library?

No. You can use this lib for whatever you want (including global state management) as long as it makes your life simple. For example, if you have a complex page and passing props and callbacks down becomes complicated you can create an updatable context fot that page.

### Does it work with React-Native?

Yes. Sometimes I want to share state between react-navigation screens (for example a multi-screen wizzard). That can be a replacement for `screenProps` that are not recommended to use anymore.

You can wrap your navigator with an updatable context provider for that:

```jsx harmony
const MyStackNavigator = createStackNavigator(...);

const MyStatefulStackNavigator = (props) => (
  <Provider initialValue={myInitialNavigatorState}>
    <MyStackNavigator {...props}/>
  </Provider>
);
MyStatefulStackNavigator.router = MyStackNavigator.router;
```

# TODO

- Complete examples
- Support updates with a function (like `setState(oldState => newState)`)

# License

MIT
