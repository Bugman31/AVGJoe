require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'AppleAI'
  s.version        = package['version']
  s.summary        = package['description']
  s.license        = package['license']
  s.homepage       = 'https://github.com/avgjoe'
  s.platform       = :ios, '26.0'
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,mm,swift}'
end
