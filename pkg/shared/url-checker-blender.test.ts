import { test } from 'node:test'
import { assertEquals, assertThrows } from './test-assert.ts'
import {
  parseBlenderReleaseDirectories,
  parseBlenderReleaseDirectory,
} from './url-checker-blender.ts'
import { urlArchiveType } from './url-archive-type.ts'

test('Blender release index is sorted newest first', () => {
  const html = `
    <a href="Blender4.5/">Blender4.5/</a>
    <a href="Blender5.9/">Blender5.9/</a>
    <a href="Blender5.10/">Blender5.10/</a>
    <a href="BlenderBenchmark2.0/">BlenderBenchmark2.0/</a>
  `
  assertEquals(
    parseBlenderReleaseDirectories(html).map((directory) => directory.name),
    ['Blender5.10', 'Blender5.9', 'Blender4.5'],
  )
})

test('Blender resolves newest stable official download and version', () => {
  const html = `
    <a href="blender-5.2.1-linux-x64.tar.xz">blender-5.2.1-linux-x64.tar.xz</a>
    <a href="blender-5.2.9-linux-x64.tar.xz">blender-5.2.9-linux-x64.tar.xz</a>
    <a href="blender-5.2.10-linux-x64.tar.xz">blender-5.2.10-linux-x64.tar.xz</a>
    <a href="blender-5.2.11-rc1-linux-x64.tar.xz">blender-5.2.11-rc1-linux-x64.tar.xz</a>
  `
  assertEquals(parseBlenderReleaseDirectory(html, 'Blender5.2', 'x86_64'), {
    binaryUrl:
      'https://download.blender.org/release/Blender5.2/blender-5.2.10-linux-x64.tar.xz',
    version: '5.2.10',
    type: 'tarxz',
    urlType: 'blender-stable',
  })
})

test('Blender ignores previews and unsupported architectures', () => {
  const html = `
    <a href="blender-5.3.0-beta-linux-x64.tar.xz">beta</a>
    <a href="blender-5.3.0-rc2-linux-x64.tar.xz">rc</a>
  `
  assertEquals(parseBlenderReleaseDirectory(html, 'Blender5.3', 'x86_64'), null)
  assertEquals(
    parseBlenderReleaseDirectory(
      '<a href="blender-5.3.0-linux-x64.tar.xz">x64</a>',
      'Blender5.3',
      'aarch64',
    ),
    null,
  )
  assertThrows(() =>
    parseBlenderReleaseDirectory(html, 'Blender5.3', 'unsupported'),
  )
})

test('archive detection handles xz and URL query strings', () => {
  assertEquals(
    urlArchiveType('https://example.com/blender.tar.xz?download=1'),
    'tarxz',
  )
  assertEquals(urlArchiveType('https://example.com/a.tar.gz'), 'targz')
  assertEquals(urlArchiveType('https://example.com/a.zip'), 'zip')
})
