import React, {Component} from 'react';
import {Button, Text, View} from 'react-native';

class SecondClass extends Component {
  constructor() {
    super();
    this.state = {
      name: 'Dhruboo',
    };
  }

  updateName = () => {
    this.setState({
      name: 'Napi',
    });
  };
  render() {
    return (
      <View>
        <Text style={{fontSize: 30}}>
          {this.state.name} & Age: {this.props.data}
        </Text>

        <Button title="Change Name" onPress={this.updateName} />
      </View>
    );
  }
}

export default SecondClass;
