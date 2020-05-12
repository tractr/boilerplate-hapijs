'use strict';

/**
 * This plugin sends emails via Mailjet.
 *
 * The config of the plugin is:
 *
 * {
 *      disabled: false, // Disable email sender. Useful for development. Default false.
 *      key: {
 *          public: '4EZLJEORWCWNM7KVMBJ7', // Required
 *          private: 'j8c7op6mxATXpvlxMZshjjts4vit6UdRqF0nUbFV', // Required
 *      },
 *      from: {
 *          name: 'Contact', // Required
 *          email: 'contact@example.com' // Required
 *      }
 * }
 * 
 * To use this plugin:

 server.mailjet.send(recipientEmail, recipientName, subject, templateId, data);

 */

const Joi = require('@hapi/joi');
const Mailjet = require('node-mailjet');

const optionsSchema = Joi.object({
	disabled: Joi.boolean().default(false),
	key: Joi.object({
		public: Joi.string().required(),
		private: Joi.string().required()
	}).required(),
	from: Joi.object({
		name: Joi.string().required(),
		email: Joi.string()
			.email()
			.lowercase()
			.required()
	}).required()
});

const register = async (server, options) => {
	// Get options
	const settings = await Joi.validate(options, optionsSchema);

	// Create Client
	const mailjetClient = Mailjet.connect(settings.key.public, settings.key.private);

	// Create and add service to server
	const service = {
		/**
		 * Create and send the email
		 *
		 * @param {string} recipientEmail
		 * @param {string} recipientName
		 * @param {string} subject
		 * @param {string} templateId
		 * @param {object} data
		 * @return {object}
		 */
		send: async (recipientEmail, recipientName, subject, templateId, data = {}) => {
			// If disabled, stop the process
			if (settings.disabled) {
				server.log(['mailer', 'send'], 'Mailer is disabled. Stop the process.');

				return;
			}

			const result = await mailjetClient.post('send', { version: 'v3.1' }).request({
				Messages: [
					{
						From: {
							Email: settings.from.email,
							Name: settings.from.name
						},
						To: [
							{
								Email: recipientEmail,
								Name: recipientName
							}
						],
						TemplateID: templateId,
						TemplateLanguage: true,
						Subject: subject,
						Variables: data
					}
				]
			});
			return result.body;
		}
	};

	// Add to the server
	server.decorate('server', 'mailjet', service);
};

exports.plugin = {
	register,
	name: 'mailjet',
	version: '1.0.0',
	description: 'Plugin for sending emails'
};
