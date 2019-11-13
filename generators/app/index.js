const Generator = require('yeoman-generator')
const merge = require('deepmerge')
const getLatestVersion = require('get-latest-version')

module.exports = class extends Generator {
	constructor(args, opts) {
		super(args, opts)
		this.eslintPluginsCfg = {
			react: {}
		}
	}

	pkgJson = {
		scripts: {
			lintjs: 'eslint . --ext js --ext jsx',
		},
		devDependencies: {},
		dependencies: {}
	}

	async prompting() {
		this.answers = await this.prompt([
			{
				type: 'checkbox',
				choices: [
					{ name: 'babel', value: 'babel', default: true },
					'react',
					'css-modules',
					'lodash',
					'sonarjs',
					'import',
					'promise',
					'jsdoc',
					'no-use-extend-native'
				],
				name: 'plugins',
				message: 'Which eslint plugins would you like to use?'
			},
			{
				type: 'list',
				name: 'indent',
				message: 'Which indent style would you like to use?',
				choices: [
					{
						name: '1 Tab',
						value: 'tab',
						default: true
					},
					{
						name: '4 spaces',
						value: 4
					},
					{
						name: '2 spaces',
						value: 2
					}
				]
			},
			{
				type: 'confirm',
				name: 'use_semi',
				message: 'Do you want to use semicolons?',
				default: false
			},
			{
				type: 'confirm',
				name: 'no_console',
				message: 'Do you want to forbid using Console (console.log, etc)?',
				default: true
			},
			{
				type: 'list',
				name: 'quotes',
				message: 'Which quotes would you like to use?',
				choices: [
					{
						name: 'Single',
						value: 'single',
						default: true
					},
					{
						name: 'Double',
						value: 'double'
					}
				]
			},
			{
				type: 'confirm',
				name: 'stylelint',
				message: 'Would you like to set up stylelint?',
				default: true
			},
			{
				type: 'confirm',
				name: 'prettier',
				message: 'Would you like to set up prettier?',
				default: true
			}
		])

		this.config.set('codestyle', {
			indent: this.answers.indent,
			semi: this.answers.use_semi,
			quotes: this.answers.quotes
		})
	}

	eslintrcPath = this.destinationPath('.eslintrc.json')

	async _addLatestDevDependency(name) {
		this.pkgJson.devDependencies[name] = `^${await getLatestVersion(name)}`
	}

	async __enableEslintPlugin(name) {
		let originalJSON = this.fs.readJSON(this.eslintrcPath)
		let pluginJSON = this.fs.readJSON(
			this.templatePath(`eslint/plugins/${name}.json`)
		)
		let json = merge(originalJSON, pluginJSON)

		await this._addLatestDevDependency(`eslint-plugin-${name}`)

		this.fs.extendJSON(this.eslintrcPath, json)
	}

	async _initEslint() {
		this.log('Setting up Eslint...')

		await this._addLatestDevDependency('eslint')
		this.fs.copyTpl(
			this.templatePath('eslint/base.json'),
			this.eslintrcPath,
			{ ...this.answers } // user answer `title` used
		)
		for (const plugin of this.answers.plugins) {
			await this.__enableEslintPlugin(plugin)
		}
	}

	async _initStylelint() {
		this.log('Setting up Stylelint...')

		await this._addLatestDevDependency('stylelint')
		await this._addLatestDevDependency('stylelint-config-css-modules')
		await this._addLatestDevDependency('stylelint-config-recommended')

		this.fs.copyTpl(
			this.templatePath('stylelint/base.json'),
			this.destinationPath('.stylelintrc'),
			{ ...this.answers }
		)
	}

	async _initPrettier() {
		this.log('Setting up Prettier...')
		this.fs.copyTpl(
			this.templatePath('prettier/base.json'),
			this.destinationPath('.prettierrc'),
			{ ...this.answers }
		)
	}

	async _writePackageJson() {
		this.fs.extendJSON(this.destinationPath('package.json'), this.pkgJson)
	}

	async writing() {
		await this._initEslint()

		if (this.answers.stylelint) {
			this.pkgJson.scripts['lintcss'] = 'stylelint .'
			await this._initStylelint()
		}

		if (this.answers.prettier) {
			await this._initPrettier()
		}

		await this._writePackageJson()
	}

	install() {
		this.npmInstall()
		this.config.save()
	}
}
