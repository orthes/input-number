function noop() {}

function defaultParser(input) {
  return input.replace(/[^\w\.-]+/g, '');
}

/**
 * When click and hold on a button - the speed of auto changin the value.
 */
var SPEED = 200;
var SPEED_UP_FACTOR = 0.9;
var MIN_SPEED = 10;

/**
 * When click and hold on a button - the delay before auto changin the value.
 */
var DELAY = 600;

/**
 * Max Safe Integer -- on IE this is not available, so manually set the number in that case.
 * The reason this is used, instead of Infinity is because numbers above the MSI are unstable
 */
var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;

export default {
  getDefaultProps: function getDefaultProps() {
    return {
      max: MAX_SAFE_INTEGER,
      min: -MAX_SAFE_INTEGER,
      step: 1,
      style: {},
      onChange: noop,
      onKeyDown: noop,
      onFocus: noop,
      onBlur: noop,
      parser: defaultParser
    };
  },
  getInitialState: function getInitialState() {
    var value = void 0;
    var props = this.props;
    if ('value' in props) {
      value = props.value;
    } else {
      value = props.defaultValue;
    }
    value = this.toNumber(value);
    return {
      inputValue: this.toPrecisionAsStep(value),
      value: value,
      focused: props.autoFocus
    };
  },
  componentWillReceiveProps: function componentWillReceiveProps(nextProps) {
    if ('value' in nextProps) {
      var value = this.state.focused ? nextProps.value : this.getValidValue(nextProps.value);
      this.setState({
        value: value,
        inputValue: value
      });
    }
  },
  componentWillUnmount: function componentWillUnmount() {
    this.stop();
  },
  onChange: function onChange(e) {
    var input = this.props.parser(this.getValueFromEvent(e).trim());
    this.setState({ inputValue: input });
    this.props.onChange(this.toNumberWhenUserInput(input)); // valid number or invalid string
  },
  onFocus: function onFocus() {
    var _props;

    this.setState({
      focused: true
    });
    (_props = this.props).onFocus.apply(_props, arguments);
  },
  onBlur: function onBlur(e) {
    var _this = this;

    for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
      args[_key - 1] = arguments[_key];
    }

    this.setState({
      focused: false
    });
    var value = this.getCurrentValidValue(this.state.inputValue);
    e.persist(); // fix https://github.com/react-component/input-number/issues/51
    this.setValue(value, function () {
      var _props2;

      (_props2 = _this.props).onBlur.apply(_props2, [e].concat(args));
    });
  },
  getCurrentValidValue: function getCurrentValidValue(value) {
    var val = value;
    if (val === '') {
      val = '';
    } else if (!this.isNotCompleteNumber(val)) {
      val = this.getValidValue(val);
    } else {
      val = this.state.value;
    }
    return this.toNumber(val);
  },
  getValidValue: function getValidValue(value) {
    var val = parseFloat(value, 10);
    // https://github.com/ant-design/ant-design/issues/7358
    if (isNaN(val)) {
      return value;
    }
    if (val < this.props.min) {
      val = this.props.min;
    }
    if (val > this.props.max) {
      val = this.props.max;
    }
    return val;
  },
  setValue: function setValue(v, callback) {
    // trigger onChange
    var newValue = this.isNotCompleteNumber(parseFloat(v, 10)) ? undefined : parseFloat(v, 10);
    var changed = newValue !== this.state.value || '' + newValue !== '' + this.state.inputValue; // https://github.com/ant-design/ant-design/issues/7363
    if (!('value' in this.props)) {
      this.setState({
        value: newValue,
        inputValue: this.toPrecisionAsStep(v)
      }, callback);
    } else {
      // always set input value same as value
      this.setState({
        inputValue: this.toPrecisionAsStep(this.state.value)
      }, callback);
    }
    if (changed) {
      this.props.onChange(newValue);
    }
  },
  getPrecision: function getPrecision(value) {
    if ('precision' in this.props) {
      return this.props.precision;
    }
    var valueString = value.toString();
    if (valueString.indexOf('e-') >= 0) {
      return parseInt(valueString.slice(valueString.indexOf('e-') + 2), 10);
    }
    var precision = 0;
    if (valueString.indexOf('.') >= 0) {
      precision = valueString.length - valueString.indexOf('.') - 1;
    }
    return precision;
  },


  // step={1.0} value={1.51}
  // press +
  // then value should be 2.51, rather than 2.5
  // if this.props.precision is undefined
  // https://github.com/react-component/input-number/issues/39
  getMaxPrecision: function getMaxPrecision(currentValue) {
    var ratio = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    if ('precision' in this.props) {
      return this.props.precision;
    }
    var step = this.props.step;

    var ratioPrecision = this.getPrecision(ratio);
    var stepPrecision = this.getPrecision(step);
    var currentValuePrecision = this.getPrecision(currentValue);
    if (!currentValue) {
      return ratioPrecision + stepPrecision;
    }
    return Math.max(currentValuePrecision, ratioPrecision + stepPrecision);
  },
  getPrecisionFactor: function getPrecisionFactor(currentValue) {
    var ratio = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 1;

    var precision = this.getMaxPrecision(currentValue, ratio);
    return Math.pow(10, precision);
  },
  toPrecisionAsStep: function toPrecisionAsStep(num) {
    if (this.isNotCompleteNumber(num) || num === '') {
      return num;
    }
    var precision = Math.abs(this.getMaxPrecision(num));
    if (!isNaN(precision)) {
      return Number(num).toFixed(precision);
    }
    return num.toString();
  },


  // '1.' '1x' 'xx' '' => are not complete numbers
  isNotCompleteNumber: function isNotCompleteNumber(num) {
    return isNaN(num) || num === '' || num === null || num && num.toString().indexOf('.') === num.toString().length - 1;
  },
  toNumber: function toNumber(num) {
    if (this.isNotCompleteNumber(num)) {
      return num;
    }
    if ('precision' in this.props) {
      return Number(Number(num).toFixed(this.props.precision));
    }
    return Number(num);
  },


  // '1.0' '1.00'  => may be a inputing number
  toNumberWhenUserInput: function toNumberWhenUserInput(num) {
    // num.length > 16 => prevent input large number will became Infinity
    if ((/\.\d*0$/.test(num) || num.length > 16) && this.state.focused) {
      return num;
    }
    return this.toNumber(num);
  },
  upStep: function upStep(val, rat) {
    var _props3 = this.props,
        step = _props3.step,
        min = _props3.min;

    var precisionFactor = this.getPrecisionFactor(val, rat);
    var precision = Math.abs(this.getMaxPrecision(val, rat));
    var result = void 0;
    if (typeof val === 'number') {
      result = ((precisionFactor * val + precisionFactor * step * rat) / precisionFactor).toFixed(precision);
    } else {
      result = min === -Infinity ? step : min;
    }
    return this.toNumber(result);
  },
  downStep: function downStep(val, rat) {
    var _props4 = this.props,
        step = _props4.step,
        min = _props4.min;

    var precisionFactor = this.getPrecisionFactor(val, rat);
    var precision = Math.abs(this.getMaxPrecision(val, rat));
    var result = void 0;
    if (typeof val === 'number') {
      result = ((precisionFactor * val - precisionFactor * step * rat) / precisionFactor).toFixed(precision);
    } else {
      result = min === -Infinity ? -step : min;
    }
    return this.toNumber(result);
  },
  step: function step(type, e) {
    var ratio = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

    if (e) {
      e.preventDefault();
    }
    var props = this.props;
    if (props.disabled) {
      return;
    }
    var value = this.getCurrentValidValue(this.state.inputValue) || 0;
    if (this.isNotCompleteNumber(value)) {
      return;
    }
    var val = this[type + 'Step'](value, ratio);
    if (val > props.max) {
      val = props.max;
    } else if (val < props.min) {
      val = props.min;
    }
    this.setValue(val);
    this.setState({
      focused: true
    });
  },
  stop: function stop(shouldContinue) {
    if (this.autoStepTimer) {
      clearTimeout(this.autoStepTimer);
    }

    if (!shouldContinue) {
      this.currentSpeed = null;
    }
  },
  down: function down(e, ratio, recursive) {
    var _this2 = this;

    if (e.persist) {
      e.persist();
    }
    this.stop(true);
    this.step('down', e, ratio);
    this.currentSpeed = this.currentSpeed * SPEED_UP_FACTOR || SPEED;
    this.currentSpeed = this.currentSpeed < MIN_SPEED ? MIN_SPEED : this.currentSpeed;
    this.autoStepTimer = setTimeout(function () {
      _this2.down(e, ratio, true);
    }, recursive ? this.currentSpeed : DELAY);
  },
  up: function up(e, ratio, recursive) {
    var _this3 = this;

    if (e.persist) {
      e.persist();
    }
    this.stop(true);
    this.step('up', e, ratio);
    this.currentSpeed = this.currentSpeed * SPEED_UP_FACTOR || SPEED;
    this.currentSpeed = this.currentSpeed < MIN_SPEED ? MIN_SPEED : this.currentSpeed;
    this.autoStepTimer = setTimeout(function () {
      _this3.up(e, ratio, true);
    }, recursive ? this.currentSpeed : DELAY);
  }
};