/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  defineComponent,
  onMounted,
  onUnmounted,
  PropType,
  ref,
  watch
} from 'vue'
import { NButton, NCard, NIcon, NModal, NTooltip } from 'naive-ui'
import { useFormItem } from 'naive-ui/es/_mixins'
import { call } from 'naive-ui/es/_utils'
import { useThemeStore } from '@/store/theme/theme'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import type {
  MaybeArray,
  OnUpdateValue,
  OnUpdateValueImpl,
  monaco as Monaco
} from './types'
import { useI18n } from 'vue-i18n'
import { ArrowsAltOutlined } from '@vicons/antd'

const props = {
  value: {
    type: String as PropType<string>,
    default: ''
  },
  defaultValue: {
    type: String as PropType<string>
  },
  'onUpdate:value': [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
  onUpdateValue: [Function, Array] as PropType<MaybeArray<OnUpdateValue>>,
  options: {
    type: Object as PropType<Monaco.editor.IStandaloneEditorConstructionOptions>,
    default: () => ({
      readOnly: false,
      language: 'shell'
    })
  },
  height: {
    type: String as PropType<string>,
    default: '300px'
  },
  showFullscreen: {
    type: Boolean as PropType<boolean>,
    default: true
  }
}

// @ts-ignore
window.MonacoEnvironment = {
  getWorker(_: any, label: string) {
    if (label === 'json') {
      return new jsonWorker()
    }
    if (['css', 'scss', 'less'].includes(label)) {
      return new cssWorker()
    }
    if (['html', 'handlebars', 'razor'].includes(label)) {
      return new htmlWorker()
    }
    if (['typescript', 'javascript'].includes(label)) {
      return new tsWorker()
    }
    return new editorWorker()
  }
}

const MonacoEditor = defineComponent({
  name: 'MonacoEditor',
  props,
  emits: ['change', 'focus', 'blur'],
  setup(props, ctx) {
    let editor = null as monaco.editor.IStandaloneCodeEditor | null
    const themeStore = useThemeStore()
    const { t } = useI18n()
    const monacoEditorThemeRef = ref(themeStore.darkTheme ? 'vs-dark' : 'vs')
    const editorRef = ref()
    const fullscreenVisible = ref(false)
    const getValue = () => editor?.getValue()
    const formItem = useFormItem({})

    const updateValue = (value: string) => {
      const { onUpdateValue, 'onUpdate:value': _onUpdateValue } = props

      if (onUpdateValue) call(onUpdateValue as OnUpdateValueImpl, value)
      if (_onUpdateValue) call(_onUpdateValue as OnUpdateValueImpl, value)
      ctx.emit('change', value)

      formItem.nTriggerFormChange()
      formItem.nTriggerFormInput()
    }

    const initMonacoEditor = () => {
      const dom = editorRef.value
      if (dom) {
        editor = monaco.editor.create(dom, {
          ...props.options,
          readOnly: formItem.mergedDisabledRef.value || props.options?.readOnly,
          value: props.defaultValue ?? props.value,
          automaticLayout: true,
          theme: monacoEditorThemeRef.value,
          scrollbar: {
            alwaysConsumeMouseWheel: false
          }
        })
        editor.onDidChangeModelContent(() => {
          const value = editor?.getValue() || ''
          updateValue(value)
        })
        editor.onDidBlurEditorWidget(() => {
          ctx.emit('blur')
          formItem.nTriggerFormBlur()
        })
        editor.onDidFocusEditorWidget(() => {
          ctx.emit('focus')
          formItem.nTriggerFormFocus()
        })
      }
    }

    onMounted(() => initMonacoEditor())

    onUnmounted(() => {
      editor?.dispose()
    })

    watch(
      () => props.value,
      (val) => {
        if (val !== getValue()) {
          editor?.setValue(val)
        }
      }
    )

    watch(
      () => formItem.mergedDisabledRef.value,
      (value) => {
        editor?.updateOptions({ readOnly: value })
      }
    )

    watch(
      () => themeStore.darkTheme,
      () => {
        editor?.dispose()
        monacoEditorThemeRef.value = themeStore.darkTheme ? 'vs-dark' : 'vs'
        initMonacoEditor()
      }
    )

    ctx.expose({ getValue })

    return {
      editorRef,
      fullscreenVisible,
      t,
      updateValue
    }
  },
  render() {
    return (
      <div style={{ position: 'relative', width: '100%' }}>
        {this.showFullscreen && (
          <NTooltip trigger='hover'>
            {{
              trigger: () => (
                <NButton
                  quaternary
                  circle
                  size='small'
                  aria-label={this.t('modal.expand_editor')}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    zIndex: 1
                  }}
                  onClick={() => (this.fullscreenVisible = true)}
                >
                  {{
                    icon: () => (
                      <NIcon>
                        <ArrowsAltOutlined />
                      </NIcon>
                    )
                  }}
                </NButton>
              ),
              default: () => this.t('modal.expand_editor')
            }}
          </NTooltip>
        )}
        <div
          ref='editorRef'
          style={{
            height: this.height,
            minHeight: '150px',
            width: '100%',
            border: '1px solid #eee'
          }}
        />
        {this.showFullscreen && (
          <NModal
            v-model={[this.fullscreenVisible, 'show']}
            display-directive='show'
            auto-focus={false}
          >
            <NCard
              title={this.t('modal.expand_editor')}
              closable
              onClose={() => (this.fullscreenVisible = false)}
              style={{
                width: '90vw',
                maxWidth: '1280px'
              }}
              contentStyle={{ padding: '0' }}
            >
              <MonacoEditor
                value={this.value}
                options={this.options}
                height='calc(90vh - 120px)'
                showFullscreen={false}
                onUpdateValue={this.updateValue}
              />
            </NCard>
          </NModal>
        )}
      </div>
    )
  }
})

export default MonacoEditor
