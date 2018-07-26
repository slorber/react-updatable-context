/* eslint-disable react/no-unused-state */
import React from 'react';

const identity = x => x;

// TODO probably too simple implementations?
const isObject = x => typeof x === 'object';
const isFunction = x => typeof x === 'function';
const isNil = x => x === null || typeof x === 'undefined';

const executeIfFunction = (maybeFunction, ...args) => {
  if (isFunction(maybeFunction)) {
    return maybeFunction(...args);
  }
  return undefined;
};

const DefaultCreateOptions = {
  defaultValue: null,
  // advanced: we can map the update api globally as an optimization so that we don't re-create update functions everytime
  mapUpdate: identity,
};

// We try to update the value the same way React does, by merging new value into the old value
const tryMergeValues = (oldValue, newValue) => {
  if (isObject(oldValue) && (isObject(newValue) || isNil(newValue))) {
    return {
      ...oldValue,
      ...newValue,
    };
  } else {
    // We also allow simple primitives as state so we can't merge them and they just get replaced
    return newValue;
  }
};

export const createUpdatableContext = (
  createOptions = DefaultCreateOptions,
) => {
  const { defaultValue, mapUpdate } = {
    ...DefaultCreateOptions,
    ...createOptions,
  };

  const { Provider, Consumer } = React.createContext(defaultValue);

  class UpdatableContextProvider extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        value: props.initialValue,
        update: mapUpdate(this.updateValue, this.getValue),
      };
    }

    getValue = () => this.state.value;

    updateValue = (value, callback) => {
      const oldValue = this.state.value;
      const newValue = tryMergeValues(oldValue, value);
      executeIfFunction(this.props.beforeUpdate, newValue, oldValue);
      this.setState({ value: newValue }, () => {
        executeIfFunction(callback);
        executeIfFunction(this.props.afterUpdate, newValue, oldValue);
      });
    };

    render() {
      return <Provider value={this.state}>{this.props.children}</Provider>;
    }
  }

  class UpdatableContextConsumer extends React.Component {
    render() {
      return (
        <Consumer>
          {providerState => {
            return this.props.children(
              providerState.value,
              providerState.update,
            );
          }}
        </Consumer>
      );
    }
  }

  const createSubConsumer = (mapValue = identity, mapUpdate = identity) => {
    const SubConsumer = ({ children }) => (
      <UpdatableContextConsumer>
        {(value, update) => children(mapValue(value), mapUpdate(update))}
      </UpdatableContextConsumer>
    );
    return SubConsumer;
  };

  // options similar to react-redux connect options
  const ConnectConsumerOptions = {
    // pure: true, TODO? is "pure" option necessary? the WrappedComponent may already be pure
    mergeProps: (valueProps, updateProps, ownProps) => {
      return {
        ...valueProps,
        ...updateProps,
        ...ownProps,
      };
    },
  };

  const connect = (
    mapper = (value, update) => ({
      context: { value, update },
    }),
    connectOptions = ConnectConsumerOptions,
  ) => WrappedComponent => {
    const { mergeProps } = { ...ConnectConsumerOptions, ...connectOptions };

    class ConnectedConsumer extends React.Component {
      render() {
        return (
          <UpdatableContextConsumer>
            {(value, update) => (
              <WrappedComponent
                {...mergeProps(mapper(value, update), this.props)}
              />
            )}
          </UpdatableContextConsumer>
        );
      }
    }

    ConnectedConsumer.displayName = `ConnectedConsumer(${WrappedComponent.displayName ||
    WrappedComponent.name ||
    'Unknown'})`;

    return ConnectedConsumer;
  };

  return {
    Provider: UpdatableContextProvider,
    Consumer: UpdatableContextConsumer,
    createSubConsumer,
    connect,
  };
};
