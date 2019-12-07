
const SLACK_INPUT =
{
  TEXT: 'text',       // text
  USER: 'user',       // id, username
  CHANNEL: 'channel', // id, name
  SPECIAL: 'special', // text
  LINK: 'link',       // url
}

module.exports = class Slack
{

  /**
   * Creates req.slack with
   *    .input
   *      .raw : string
   *      .match(/regex/) : boolean
   *      SlackInputObject[]
   */
  static BodyParser(req, res, next)
  {
    // TODO? check if text is empty vs. undefined '/check_score' should have empty text field
    if (!req.body || !req.body.text)
    {
      SendResponseMessage(
        res,
        'Failed to parse request: no body',
        { in_channel: false, markdown: false}
      );

      // Do not continue to handle the request any further
      return;
    }

    try
    {
      req.slack = {
        input: Slack.ParseMessage(req.body.text)
      }
      next();
    }
    catch (error)
    {
      SendResponseMessage(
        res,
        `Failed to parse request: ${error.message}`
      );

      // Do not continue to handle the request any further
      return;
    }
  }

  static ParseMessage(text)
  {
    var inputs = [];
    text
      .split(' ')
      .filter(x => !!x)
      .forEach(word =>
      {
        const lastInput = inputs.length ? inputs[inputs.length-1] : null;
        if (word.match(/^<.+>$/))
        {
          inputs.push(this.ParseObject(word));
        }
        else if (lastInput && lastInput.type === SLACK_INPUT.TEXT)
        {
          lastInput.text += ' ' + word;
        }
        else
        {
          inputs.push({
            type: SLACK_INPUT.TEXT,
            text: word
          });
        }
      });

    inputs.raw = text;
    inputs.match = function(regex)
    {
      var typevals = '';
      this.forEach(input => typevals += input.type);
      return typevals.match(regex);
    }

    return inputs;
  }

  static ParseObject(text)
  {
    var match = text.match(/^<.+>$/);
    if (!match)
    {
      throw new Error(`Invalid slack object argument '${text}'`);
    }

    match = text.match(/^<@((?:U|W)\w+)(?:\|(\w+))?>$/);
    if (match)
    {
      return {
        type: SLACK_INPUT.USER,
        id: match[1],
        username: match[2]
      }
    }

    match = text.match(/^<#(\w+)(?:\|(\w+))?>$/);
    if (match)
    {
      return {
        type: SLACK_INPUT.CHANNEL,
        id: match[1],
        name: match[2]
      }
    }

    match = text.match(/^<!(.+)>$/);
    if (match)
    {
      return {
        type: SLACK_INPUT.SPECIAL,
        text: match[1]
      }
    }

    match = text.match(/^<(.+)>$/);
    if (match)
    {
      return {
        type: SLACK_INPUT.LINK,
        url: match[1]
      }
    }

    throw Error('Slack input object did not match any known formats');
  }

  /**
    Sends a response message using the res object
   */
  static SendResponseMessage(
    res,
    text,
    {
      in_channel = false,
      markdown = false,
      statusCode = 200,
    } = {}
  )
  {
    const response_type = in_channel ? 'in_channel' : 'ephemeral';
    const mrkdwn = !!markdown;

    res.status(statusCode).send({
      response_type,
      mrkdwn,
      text
    });
  }
}